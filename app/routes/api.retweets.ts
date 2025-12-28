import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const retweetActionSchema = z.object({
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

        const result = retweetActionSchema.safeParse({ tweetId });

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

        // 이미 리트윗 했는지 확인
        const existingRetweet = await prisma.retweet.findUnique({
            where: {
                userId_tweetId: {
                    userId: userId,
                    tweetId: targetTweetId,
                },
            },
        });

        let retweeted = false;

        if (existingRetweet) {
            // 이미 리트윗했다면 삭제 (리트윗 취소)
            await prisma.retweet.delete({
                where: {
                    userId_tweetId: {
                        userId: userId,
                        tweetId: targetTweetId,
                    },
                },
            });
            retweeted = false;
        } else {
            // 리트윗하기
            await prisma.retweet.create({
                data: {
                    userId: userId,
                    tweetId: targetTweetId,
                },
            });
            retweeted = true;
        }

        // 최신 리트윗 개수 조회
        const count = await prisma.retweet.count({
            where: { tweetId: targetTweetId },
        });

        return data({
            success: true,
            retweeted,
            count,
            message: retweeted ? "리트윗했습니다." : "리트윗을 취소했습니다."
        }, { status: 200 });

    } catch (error) {
        console.error("Retweet Action Error:", error);
        return data({ error: "리트윗 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
