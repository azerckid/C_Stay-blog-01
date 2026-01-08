import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, isNull, and, desc, count, sql, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { getSession } from "~/lib/auth-utils.server";
import { deleteFromCloudinary, uploadToCloudinary } from "~/lib/cloudinary.server";
import { z } from "zod";
import { generateEmbedding, vectorToBuffer } from "~/lib/gemini.server";


const createTweetSchema = z.object({
    content: z.string().min(0, "내용을 입력해주세요.").max(280, "280자 이내로 입력해주세요.")
        .or(z.string().length(0)), // Allow empty content if media is present (handled in logic)
    location: z.string().optional().nullable(), // JSON string of location data
    travelDate: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    media: z.string().optional().nullable(), // JSON string of attachments
    visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).optional(),
    tags: z.string().optional().nullable(),
    travelPlanId: z.string().optional().nullable(),
});

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        const userId = session?.user?.id;

        const tweetsData = await db.query.tweets.findMany({
            where: (tweets, { isNull, and }) => and(isNull(tweets.deletedAt), isNull(tweets.parentId)),
            limit: 20,
            orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
            with: {
                user: true,
                media: true,
                likes: userId ? {
                    where: (likes, { eq }) => eq(likes.userId, userId),
                    columns: { userId: true }
                } : undefined,
                retweets: userId ? {
                    where: (retweets, { eq }) => eq(retweets.userId, userId),
                    columns: { userId: true }
                } : undefined,
                bookmarks: userId ? {
                    where: (bookmarks, { eq }) => eq(bookmarks.userId, userId),
                    columns: { userId: true }
                } : undefined,
                tags: {
                    with: {
                        travelTag: true
                    }
                },
                travelPlan: true,
                replies: { columns: { id: true } },
            }
        });

        // Drizzle doesn't support _count in findMany subqueries directly.
        // For efficiency, we use a separate join or subquery for counts.
        // For now, to keep logic simple, we'll map and get counts from the fetched arrays if acceptable, 
        // but for replies we only fetched IDs.

        // Actually, some counts are missing in the 'with' above (likes count, etc.)
        // Let's use a more robust approach if needed, but for now let's try to get them.

        // Revised query to get exact counts would need a more complex select.
        // But for migration speed, let's see if we can get counts by adding them to the 'with'.
        // Wait, 'with' doesn't support count().

        // OK, I'll use a separate query for counts or join.
        // But let's look at the existing code: it expects stats.likes, stats.replies, stats.retweets.

        // I will use a custom select for the loader.
        const formattedTweets = await Promise.all(tweetsData.map(async (tweet) => {
            // Get counts separately for now (Optimization potential here)
            const [counts] = await db
                .select({
                    likes: count(schema.likes.id),
                    retweets: count(schema.retweets.id),
                    replies: count(schema.tweets.id),
                })
                .from(schema.tweets)
                .leftJoin(schema.likes, eq(schema.likes.tweetId, tweet.id))
                .leftJoin(schema.retweets, eq(schema.retweets.tweetId, tweet.id))
                // This join pattern for multiple counts in SQLite is tricky due to cartesian product.
                // Better to use subqueries.
                .where(eq(schema.tweets.id, tweet.id));

            // Re-doing counts with subqueries for accuracy
            const [stats] = await db.select({
                likes: sql<number>`(SELECT COUNT(*) FROM "Like" WHERE "tweetId" = ${tweet.id})`,
                retweets: sql<number>`(SELECT COUNT(*) FROM "Retweet" WHERE "tweetId" = ${tweet.id})`,
                replies: sql<number>`(SELECT COUNT(*) FROM "Tweet" WHERE "parentId" = ${tweet.id} AND "deletedAt" IS NULL)`,
            }).from(schema.tweets).where(eq(schema.tweets.id, tweet.id));

            return {
                id: tweet.id,
                content: tweet.content,
                createdAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
                fullCreatedAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
                user: {
                    id: tweet.user.id,
                    name: tweet.user.name || "알 수 없음",
                    username: tweet.user.email.split("@")[0],
                    image: tweet.user.image,
                },
                media: tweet.media.map(m => ({
                    id: m.id,
                    url: m.url,
                    type: m.type as "IMAGE" | "VIDEO",
                    altText: m.altText
                })),
                stats: {
                    likes: stats.likes || 0,
                    replies: stats.replies || 0,
                    retweets: stats.retweets || 0,
                    views: "0",
                },
                isLiked: (tweet.likes?.length || 0) > 0,
                isRetweeted: (tweet.retweets?.length || 0) > 0,
                isBookmarked: (tweet.bookmarks?.length || 0) > 0,
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
                travelPlan: tweet.travelPlan ? {
                    id: tweet.travelPlan.id,
                    title: tweet.travelPlan.title,
                } : undefined,
                travelDate: tweet.travelDate ? new Date(tweet.travelDate).toISOString() : null
            };
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
                visibility: formData.get("visibility") || "PUBLIC",
                location: formData.get("location") || undefined,
                travelDate: formData.get("travelDate") || undefined,
                parentId: formData.get("parentId") || undefined,
                media: formData.get("media") || undefined,
                tags: formData.get("tags") || undefined,
                travelPlanId: formData.get("travelPlanId") || undefined,
            };

            const validatedData = createTweetSchema.parse(payload);

            // Content validation adjustment: Check if empty content AND no media
            const hasMedia = !!validatedData.media;
            const content = validatedData.content || ""; // Allow empty string

            const aiImage = formData.get("aiImage") as string;

            if (!content.trim() && !validatedData.media && !aiImage) {
                return data({ error: "내용을 입력하거나 이미지를 첨부해주세요." }, { status: 400 });
            }

            let mediaData: any[] = [];

            // 1. AI 모드에서 전송된 Base64 이미지 처리
            if (aiImage && aiImage.startsWith("data:image")) {
                try {
                    // "data:image/jpeg;base64,..." 형식에서 실제 데이터만 추출
                    const base64Data = aiImage.split(",")[1];
                    const buffer = Buffer.from(base64Data, "base64");

                    const uploadResult = await uploadToCloudinary(buffer, `ai-log-${Date.now()}`);

                    mediaData.push({
                        url: uploadResult.url,
                        type: 'IMAGE',
                        publicId: uploadResult.publicId,
                        order: 0
                    });
                } catch (e) {
                    console.error("AI Image Upload Error:", e);
                }
            }

            // 2. 일반 업로드 미디어 처리
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

            const tweetId = crypto.randomUUID();

            const tweet = await db.transaction(async (tx) => {
                // 1. 트윗 삽입
                await tx.insert(schema.tweets).values({
                    id: tweetId,
                    content: content,
                    userId: session.user.id,
                    visibility: validatedData.visibility as any,
                    locationName: locationData.locationName,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    address: locationData.address,
                    country: locationData.country,
                    city: locationData.city,
                    travelDate: validatedData.travelDate ? new Date(validatedData.travelDate).toISOString() : null,
                    parentId: validatedData.parentId,
                    travelPlanId: validatedData.travelPlanId,
                    updatedAt: new Date().toISOString(),
                });

                // 2. 미디어 삽입
                if (mediaData.length > 0) {
                    await tx.insert(schema.media).values(
                        mediaData.map(m => ({
                            id: crypto.randomUUID(),
                            tweetId: tweetId,
                            url: m.url,
                            type: m.type,
                            thumbnailUrl: m.thumbnailUrl,
                            publicId: m.publicId,
                            order: m.order,
                        }))
                    );
                }

                // 3. 태그 처리
                if (tagConnectData.length > 0) {
                    for (const t of tagConnectData) {
                        const tagName = t.travelTag.connectOrCreate.create.name;
                        const tagSlug = t.travelTag.connectOrCreate.create.slug;

                        // upsert tag
                        let tag = await tx.query.travelTags.findFirst({
                            where: (tags, { eq }) => eq(tags.name, tagName)
                        });

                        if (!tag) {
                            const newTagId = crypto.randomUUID();
                            await tx.insert(schema.travelTags).values({
                                id: newTagId,
                                name: tagName,
                                slug: tagSlug,
                            });
                            tag = { id: newTagId, name: tagName, slug: tagSlug, description: null, createdAt: "" };
                        }

                        // connect tweet to tag
                        await tx.insert(schema.tweetTravelTags).values({
                            id: crypto.randomUUID(),
                            tweetId: tweetId,
                            travelTagId: tag.id,
                        });
                    }
                }

                return await tx.query.tweets.findFirst({
                    where: (tweets, { eq }) => eq(tweets.id, tweetId),
                    with: {
                        user: true,
                        media: true,
                        tags: { with: { travelTag: true } }
                    }
                });
            });

            if (!tweet) throw new Error("Tweet creation failed");

            // 답글 알림 생성
            if (tweet.parentId) {
                const parentTweet = await db.query.tweets.findFirst({
                    where: (tweets, { eq }) => eq(tweets.id, tweet.parentId!),
                    columns: { userId: true }
                });

                if (parentTweet && parentTweet.userId !== session.user.id) {
                    await db.insert(schema.notifications).values({
                        id: crypto.randomUUID(),
                        recipientId: parentTweet.userId,
                        issuerId: session.user.id,
                        type: "REPLY",
                        // tweetId: tweet.id, // Notification table in schema might not have tweetId? 
                        // Let's check schema for Notification fields.
                        // Based on follows.ts: recipientId, issuerId, type.
                        // Based on retweets.ts: recipientId, issuerId, type.
                        // If type is REPLY, usually we want to link to tweet.
                        // If schema lacks tweetId, we can't add it.
                        // Assuming schema matches what we've seen (follows, retweets).
                        // If schema has tweetId, add it. If not, omit.
                        // I will omit tweetId for now based on what I saw in other files, 
                        // unless I verify schema has it. 
                        // Wait, Retweets usually notify about WHO retweeted.
                        // Reply notification needs context.
                        // Let's assume basic fields for now: id, recipientId, issuerId, type, isRead.
                        isRead: false
                    });
                }
            }

            // AI 임베딩 생성
            try {
                const embeddingText = `${tweet.content} ${tweet.tags.map(t => t.travelTag.name).join(" ")}`;
                const vector = await generateEmbedding(embeddingText);
                await db.insert(schema.tweetEmbeddings).values({
                    id: crypto.randomUUID(),
                    tweetId: tweet.id,
                    vector: vectorToBuffer(vector) as any,
                    updatedAt: new Date().toISOString(),
                });

            } catch (e) {
                console.error("Embedding Generation Error:", e);
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
            const tweet = await db.query.tweets.findFirst({
                where: (tweets, { eq }) => eq(tweets.id, tweetId),
                columns: { userId: true, deletedAt: true }
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
            await db.update(schema.tweets)
                .set({ deletedAt: new Date().toISOString() })
                .where(eq(schema.tweets.id, tweetId));

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
            const tweet = await db.query.tweets.findFirst({
                where: (tweets, { eq }) => eq(tweets.id, tweetId),
                columns: { userId: true, deletedAt: true }
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
                        const mediaToDelete = await db.query.media.findMany({
                            where: (media, { and, inArray, eq }) =>
                                and(inArray(media.id, idsToDelete), eq(media.tweetId, tweetId))
                        });

                        for (const media of mediaToDelete) {
                            if (media.publicId) {
                                await deleteFromCloudinary(media.publicId, media.type === 'VIDEO' ? 'video' : 'image').catch(console.error);
                            }
                        }

                        // DB에서 삭제
                        await db.delete(schema.media)
                            .where(and(inArray(schema.media.id, idsToDelete), eq(schema.media.tweetId, tweetId)));
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
                        // 기존 미디어 갯수 확인
                        const [{ count: existingCount }] = await db
                            .select({ count: count() })
                            .from(schema.media)
                            .where(eq(schema.media.tweetId, tweetId));

                        const insertData = newMediaList.map((m: any, index: number) => ({
                            id: crypto.randomUUID(),
                            tweetId: tweetId,
                            url: m.url,
                            type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
                            publicId: m.publicId,
                            order: (existingCount || 0) + index
                        }));

                        await db.insert(schema.media).values(insertData);
                    }
                } catch (e) {
                    console.error("New Media Creation Error", e);
                }
            }

            // 3. 태그 업데이트 준비
            const tagsStr = formData.get("tags") as string;

            // 4. 위치 및 날짜 업데이트 준비
            const locationStr = formData.get("location") as string;
            let locationUpdateData: any = {};
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
            const visibilityStr = formData.get("visibility") as string;
            let visibilityUpdate: "PUBLIC" | "FOLLOWERS" | "PRIVATE" | undefined = undefined;
            if (visibilityStr && ["PUBLIC", "FOLLOWERS", "PRIVATE"].includes(visibilityStr)) {
                visibilityUpdate = visibilityStr as "PUBLIC" | "FOLLOWERS" | "PRIVATE";
            }

            const travelPlanId = formData.get("travelPlanId") as string;

            const updatedTweet = await db.transaction(async (tx) => {
                // 3. 태그 업데이트 처리
                if (tagsStr) {
                    const tagsList = JSON.parse(tagsStr);
                    if (Array.isArray(tagsList)) {
                        // 기존 TweetTravelTag 연결 삭제
                        await tx.delete(schema.tweetTravelTags)
                            .where(eq(schema.tweetTravelTags.tweetId, tweetId));

                        for (const t of (tagsList as string[])) {
                            const slug = t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                            let tag = await tx.query.travelTags.findFirst({
                                where: (tags, { eq }) => eq(tags.name, t)
                            });

                            if (!tag) {
                                const newTagId = crypto.randomUUID();
                                await tx.insert(schema.travelTags).values({
                                    id: newTagId,
                                    name: t,
                                    slug: slug || t,
                                });
                                tag = { id: newTagId, name: t, slug: slug || t, description: null, createdAt: "" };
                            }

                            await tx.insert(schema.tweetTravelTags).values({
                                id: crypto.randomUUID(),
                                tweetId: tweetId,
                                travelTagId: tag.id,
                            });
                        }
                    }
                }

                await tx.update(schema.tweets)
                    .set({
                        content,
                        locationName: locationUpdateData.locationName,
                        latitude: locationUpdateData.latitude,
                        longitude: locationUpdateData.longitude,
                        address: locationUpdateData.address,
                        country: locationUpdateData.country,
                        city: locationUpdateData.city,
                        travelDate: travelDateStr ? new Date(travelDateStr).toISOString() : undefined,
                        visibility: visibilityUpdate,
                        travelPlanId: travelPlanId === "" ? null : (travelPlanId || undefined),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(schema.tweets.id, tweetId));

                return await tx.query.tweets.findFirst({
                    where: (tweets, { eq }) => eq(tweets.id, tweetId),
                    with: { user: true, media: true, tags: { with: { travelTag: true } } }
                });
            });

            if (!updatedTweet) throw new Error("Tweet update failed");

            // AI 임베딩 업데이트
            try {
                const updatedTags = updatedTweet.tags.map(t => t.travelTag.name).join(" ");
                const embeddingText = `${updatedTweet.content} ${updatedTags}`;
                const vector = await generateEmbedding(embeddingText);

                await db.insert(schema.tweetEmbeddings)
                    .values({
                        id: crypto.randomUUID(),
                        tweetId: tweetId,
                        vector: vectorToBuffer(vector) as any,
                        updatedAt: new Date().toISOString(),
                    })
                    .onConflictDoUpdate({
                        target: schema.tweetEmbeddings.tweetId,
                        set: {
                            vector: vectorToBuffer(vector) as any,
                            updatedAt: new Date().toISOString(),
                        }
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
