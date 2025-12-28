import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const createTweetSchema = z.object({
    content: z.string().min(1, "내용을 입력해주세요.").max(280, "280자 이내로 입력해주세요."),
    locationName: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    travelDate: z.string().optional().nullable(),
});

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        const userId = session?.user?.id;

        const tweets = await prisma.tweet.findMany({
            where: {
                deletedAt: null, // Soft Delete: 삭제되지 않은 트윗만 조회
            },
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                user: true,
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                        retweets: true,
                    }
                },
                // 현재 로그인한 사용자가 좋아요/리트윗/북마크 했는지 확인
                likes: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false,
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
            stats: {
                likes: tweet._count.likes,
                replies: tweet._count.replies,
                retweets: tweet._count.retweets,
                views: "0",
            },
            isLiked: tweet.likes?.length > 0, // 좋아요 여부 (배열이 비어있지 않으면 true)
            location: tweet.locationName ? {
                name: tweet.locationName,
                city: tweet.city,
                country: tweet.country,
                travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
            } : undefined
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
                locationName: formData.get("locationName") || undefined,
                country: formData.get("country") || undefined,
                city: formData.get("city") || undefined,
                travelDate: formData.get("travelDate") || undefined,
            };

            const validatedData = createTweetSchema.parse(payload);

            const tweet = await prisma.tweet.create({
                data: {
                    content: validatedData.content,
                    userId: session.user.id,
                    locationName: validatedData.locationName,
                    country: validatedData.country,
                    city: validatedData.city,
                    travelDate: validatedData.travelDate ? new Date(validatedData.travelDate as unknown as string) : undefined,
                },
                include: {
                    user: true,
                }
            });

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

            const updatedTweet = await prisma.tweet.update({
                where: { id: tweetId },
                data: { content },
                include: { user: true }
            });

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
