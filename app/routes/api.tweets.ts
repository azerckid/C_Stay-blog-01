import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { getSession } from "~/lib/auth-utils.server";
import { deleteFromCloudinary } from "~/lib/cloudinary.server";
import { z } from "zod";
import { generateEmbedding, vectorToBuffer } from "~/lib/gemini.server";


const createTweetSchema = z.object({
    content: z.string().min(0, "내용을 입력해주세요.").max(280, "280자 이내로 입력해주세요.")
        .or(z.string().length(0)), // Allow empty content if media is present (handled in logic)
    location: z.string().optional().nullable(), // JSON string of location data
    travelDate: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    media: z.string().optional().nullable(), // JSON string of attachments
    tags: z.string().optional().nullable(), // JSON string of tags
});

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        const userId = session?.user?.id;

        const tweets = await prisma.tweet.findMany({
            where: {
                deletedAt: null,
                parentId: null,
            },
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                user: true,
                media: true,
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                        retweets: true,
                    }
                },
                likes: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false,
                retweets: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false,
                tags: {
                    include: {
                        travelTag: true
                    }
                }
            }
        });

        const formattedTweets = tweets.map(tweet => ({
            id: tweet.id,
            content: tweet.content,
            createdAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
            fullCreatedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
            user: {
                id: tweet.user.id,
                name: tweet.user.name || "알 수 없음",
                username: tweet.user.email.split("@")[0],
                image: tweet.user.image,
            },
            media: tweet.media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                altText: m.altText
            })),
            stats: {
                likes: tweet._count.likes,
                replies: tweet._count.replies,
                retweets: tweet._count.retweets,
                views: "0",
            },
            isLiked: tweet.likes && tweet.likes.length > 0,
            isRetweeted: tweet.retweets && tweet.retweets.length > 0,
            location: tweet.locationName ? {
                name: tweet.locationName,
                latitude: tweet.latitude,
                longitude: tweet.longitude,
                address: tweet.address,
                city: tweet.city,
                country: tweet.country,
                travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
            } : undefined,
            tags: tweet.tags.map(t => ({
                id: t.travelTag.id,
                name: t.travelTag.name,
                slug: t.travelTag.slug
            })),
            travelDate: tweet.travelDate ? new Date(tweet.travelDate).toISOString() : null
        }));

        return data({ tweets: formattedTweets });
    } catch (error) {
        console.error("Tweet Fetch Error:", error);
        return data({ error: "트윗을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // POST: 트윗 작성
    if (request.method === "POST") {
        try {
            const formData = await request.formData();
            const payload = {
                content: formData.get("content"),
                location: formData.get("location") || undefined,
                travelDate: formData.get("travelDate") || undefined,
                parentId: formData.get("parentId") || undefined,
                media: formData.get("media") || undefined,
                tags: formData.get("tags") || undefined,
            };

            const validatedData = createTweetSchema.parse(payload);

            // Content validation adjustment: Check if empty content AND no media
            const hasMedia = !!validatedData.media;
            const content = validatedData.content || ""; // Allow empty string

            if (!content.trim() && !hasMedia) {
                return data({ error: "내용을 입력하거나 이미지를 첨부해주세요." }, { status: 400 });
            }

            let mediaData: any[] = [];
            if (validatedData.media) {
                try {
                    const parsedMedia = JSON.parse(validatedData.media);
                    if (Array.isArray(parsedMedia)) {
                        mediaData = parsedMedia.map((m: any, index: number) => ({
                            url: m.url,
                            type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
                            thumbnailUrl: m.thumbnailUrl,
                            publicId: m.publicId,
                            order: index
                        }));
                    }
                } catch (e) {
                    console.error("Media Parse Error", e);
                }
            }

            let locationData: any = {};
            if (validatedData.location) {
                try {
                    const parsed = JSON.parse(validatedData.location);
                    locationData = {
                        locationName: parsed.name,
                        latitude: parsed.latitude,
                        longitude: parsed.longitude,
                        address: parsed.address,
                        country: parsed.country,
                        city: parsed.city
                    };
                } catch (e) {
                    console.error("Location Parse Error", e);
                }
            }

            let tagConnectData: any[] = [];
            if (validatedData.tags) {
                try {
                    const tagsList = JSON.parse(validatedData.tags);
                    if (Array.isArray(tagsList)) {
                        tagConnectData = tagsList.map((t: string) => {
                            const slug = t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            return {
                                travelTag: {
                                    connectOrCreate: {
                                        where: { name: t },
                                        create: { name: t, slug: slug || t }
                                    }
                                }
                            };
                        });
                    }
                } catch (e) {
                    console.error("Tags Parse Error", e);
                }
            }

            const tweet = await prisma.tweet.create({
                data: {
                    content: content,
                    userId: session.user.id,
                    ...locationData,
                    travelDate: validatedData.travelDate ? new Date(validatedData.travelDate as unknown as string) : undefined,
                    parentId: validatedData.parentId,
                    media: {
                        create: mediaData
                    },
                    tags: {
                        create: tagConnectData
                    }
                },
                include: {
                    user: true,
                    media: true,
                    tags: { include: { travelTag: true } }
                }
            });

            // AI 임베딩 생성 (Background 또는 Sync 지만 여기서는 안전하게 처리)
            try {
                const embeddingText = `${tweet.content} ${tagConnectData.map((t: any) => t.travelTag.connectOrCreate.create.name).join(" ")}`;
                const vector = await generateEmbedding(embeddingText);
                await prisma.tweetEmbedding.create({
                    data: {
                        tweetId: tweet.id,
                        vector: vectorToBuffer(vector) as any
                    }
                });

            } catch (e) {
                console.error("Embedding Generation Error:", e);
                // 임베딩 실패가 트윗 작성 실패로 이어지지는 않도록 함
            }

            return data({ success: true, tweet }, { status: 201 });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return data({ error: error.issues[0].message }, { status: 400 });
            }
            console.error("Tweet Creation Error:", error);
            return data({ error: "트윗 작성 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    // DELETE: 트윗 삭제
    if (request.method === "DELETE") {
        const formData = await request.formData();
        const tweetId = formData.get("tweetId") as string;

        if (!tweetId) {
            return data({ error: "트윗 ID가 필요합니다." }, { status: 400 });
        }

        try {
            // 본인 확인 (작성자만 삭제 가능)
            const tweet = await prisma.tweet.findUnique({
                where: { id: tweetId },
                select: { userId: true, deletedAt: true }
            });

            if (!tweet) {
                return data({ error: "트윗을 찾을 수 없습니다." }, { status: 404 });
            }

            // 이미 삭제된 트윗인지 확인
            if (tweet.deletedAt) {
                return data({ error: "이미 삭제된 트윗입니다." }, { status: 404 });
            }

            if (tweet.userId !== session.user.id) {
                return data({ error: "삭제 권한이 없습니다." }, { status: 403 });
            }

            // Soft Delete: deletedAt을 현재 시간으로 설정
            await prisma.tweet.update({
                where: { id: tweetId },
                data: { deletedAt: new Date() }
            });

            return data({ success: true, message: "트윗이 삭제되었습니다." }, { status: 200 });

        } catch (error) {
            console.error("Tweet Deletion Error:", error);
            return data({ error: "트윗 삭제 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    // PATCH: 트윗 수정
    if (request.method === "PATCH") {
        const formData = await request.formData();
        const tweetId = formData.get("tweetId") as string;
        const content = formData.get("content") as string;

        if (!tweetId || !content) {
            return data({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
        }

        try {
            // 본인 확인
            const tweet = await prisma.tweet.findUnique({
                where: { id: tweetId },
                select: { userId: true, deletedAt: true }
            });

            if (!tweet) {
                return data({ error: "트윗을 찾을 수 없습니다." }, { status: 404 });
            }

            // 삭제된 트윗은 수정 불가
            if (tweet.deletedAt) {
                return data({ error: "삭제된 트윗은 수정할 수 없습니다." }, { status: 404 });
            }

            if (tweet.userId !== session.user.id) {
                return data({ error: "수정 권한이 없습니다." }, { status: 403 });
            }

            // 1. 미디어 삭제 처리
            const deletedMediaIdsStr = formData.get("deletedMediaIds") as string;
            if (deletedMediaIdsStr) {
                try {
                    const idsToDelete = JSON.parse(deletedMediaIdsStr);
                    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
                        // DB에서 미디어 조회 (Cloudinary 삭제를 위해 publicId 필요)
                        const mediaToDelete = await prisma.media.findMany({
                            where: {
                                id: { in: idsToDelete },
                                tweetId: tweetId // 안전 장치: 해당 트윗의 미디어만 삭제
                            }
                        });

                        for (const media of mediaToDelete) {
                            // Cloudinary에서 삭제 (Async non-blocking would be better usually, but ensuring cleanup here)
                            if (media.publicId) {
                                await deleteFromCloudinary(media.publicId, media.type === 'VIDEO' ? 'video' : 'image').catch(console.error);
                            }
                        }

                        // DB에서 삭제
                        await prisma.media.deleteMany({
                            where: {
                                id: { in: idsToDelete },
                                tweetId: tweetId
                            }
                        });
                    }
                } catch (e) {
                    console.error("Media Deletion Error", e);
                }
            }

            // 2. 새로운 미디어 추가 처리
            const newMediaStr = formData.get("newMedia") as string;
            if (newMediaStr) {
                try {
                    const newMediaList = JSON.parse(newMediaStr);
                    if (Array.isArray(newMediaList) && newMediaList.length > 0) {
                        // 기존 미디어 갯수 확인 (순서 정렬을 위해)
                        const existingCount = await prisma.media.count({ where: { tweetId } });

                        const createData = newMediaList.map((m: any, index: number) => ({
                            tweetId: tweetId,
                            url: m.url,
                            type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
                            publicId: m.publicId,
                            order: existingCount + index
                        }));

                        await prisma.media.createMany({
                            data: createData
                        });
                    }
                } catch (e) {
                    console.error("New Media Creation Error", e);
                }
            }

            // 3. 태그 업데이트 처리
            const tagsStr = formData.get("tags") as string;
            let tagsUpdateData = undefined;

            if (tagsStr) {
                try {
                    const tagsList = JSON.parse(tagsStr);
                    if (Array.isArray(tagsList)) {
                        // 기존 태그 연결 모두 제거 후 새로 생성
                        const createList = tagsList.map((t: string) => {
                            const slug = t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            return {
                                travelTag: {
                                    connectOrCreate: {
                                        where: { name: t },
                                        create: { name: t, slug: slug || t }
                                    }
                                }
                            };
                        });

                        tagsUpdateData = {
                            deleteMany: {}, // 기존 TweetTravelTag 연결 삭제
                            create: createList
                        };
                    }
                } catch (e) {
                    console.error("Tags Update Error", e);
                }
            }

            // 4. 위치 및 날짜 업데이트 처리
            const locationStr = formData.get("location") as string;
            let locationUpdateData: any = {};
            // 명시적으로 null이나 빈 문자열이 전송된 경우 삭제 처리 필요하다면 로직 추가
            // 현재 로직은 전송된 경우만 업데이트 (Partial Update)

            if (locationStr) {
                try {
                    const parsed = JSON.parse(locationStr);
                    locationUpdateData = {
                        locationName: parsed.name,
                        latitude: parsed.latitude,
                        longitude: parsed.longitude,
                        address: parsed.address,
                        country: parsed.country,
                        city: parsed.city
                    };
                } catch (e) {
                    console.error("Location Parse Error", e);
                }
            }

            const travelDateStr = formData.get("travelDate") as string;
            // travelDateStr가 있으면 날짜 업데이트

            const updatedTweet = await prisma.tweet.update({
                where: { id: tweetId },
                data: {
                    content,
                    tags: tagsUpdateData,
                    ...locationUpdateData,
                    travelDate: travelDateStr ? new Date(travelDateStr) : undefined
                },
                include: { user: true, media: true, tags: { include: { travelTag: true } } }
            });

            // AI 임베딩 업데이트
            try {
                const updatedTags = updatedTweet.tags.map(t => t.travelTag.name).join(" ");
                const embeddingText = `${updatedTweet.content} ${updatedTags}`;
                const vector = await generateEmbedding(embeddingText);

                await prisma.tweetEmbedding.upsert({
                    where: { tweetId: tweetId },
                    update: { vector: vectorToBuffer(vector) as any },
                    create: { tweetId: tweetId, vector: vectorToBuffer(vector) as any }
                });

            } catch (e) {
                console.error("Embedding Update Error:", e);
            }

            return data({ success: true, tweet: updatedTweet, message: "트윗이 수정되었습니다." }, { status: 200 });


        } catch (error) {
            if (error instanceof z.ZodError) {
                return data({ error: error.issues[0].message }, { status: 400 });
            }
            console.error("Tweet Update Error:", error);
            return data({ error: "트윗 수정 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    return data({ error: "Method Not Allowed" }, { status: 405 });
}
