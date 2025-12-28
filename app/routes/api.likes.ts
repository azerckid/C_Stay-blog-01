import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const likeActionSchema = z.object({
    tweetId: z.string().min(1, "트윗 ID가 필요합니다."),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (request.method !== "POST") {
        return data({ error: "Method Not Allowed" }, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const tweetId = formData.get("tweetId");

        const result = likeActionSchema.safeParse({ tweetId });

        if (!result.success) {
            return data({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { tweetId: targetTweetId } = result.data;
        const userId = session.user.id;

        // 트윗 존재 여부 확인
        const tweet = await prisma.tweet.findUnique({
            where: { id: targetTweetId },
        });

        if (!tweet) {
            return data({ error: "트윗을 찾을 수 없습니다." }, { status: 404 });
        }

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_tweetId: {
                    userId: userId,
                    tweetId: targetTweetId,
                },
            },
        });

        let liked = false;

        if (existingLike) {
            // 이미 좋아요가 있다면 삭제 (좋아요 취소)
            await prisma.like.delete({
                where: {
                    userId_tweetId: {
                        userId: userId,
                        tweetId: targetTweetId,
                    },
                },
            });
            liked = false;
        } else {
            // 좋아요가 없다면 생성 (좋아요)
            await prisma.like.create({
                data: {
                    userId: userId,
                    tweetId: targetTweetId,
                },
            });
            liked = true;
        }

        // 최신 좋아요 개수 조회
        const count = await prisma.like.count({
            where: { tweetId: targetTweetId },
        });

        return data({
            success: true,
            liked,
            count,
            message: liked ? "좋아요를 눌렀습니다." : "좋아요를 취소했습니다."
        }, { status: 200 });

    } catch (error) {
        console.error("Like Action Error:", error);
        return data({ error: "좋아요 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
