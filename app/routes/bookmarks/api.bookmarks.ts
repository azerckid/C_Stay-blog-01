import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const bookmarkActionSchema = z.object({
    tweetId: z.string().min(1, "트윗 ID가 필요합니다."),
    collectionId: z.string().optional().nullable(),
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
        const collectionId = formData.get("collectionId");

        const result = bookmarkActionSchema.safeParse({ tweetId, collectionId });

        if (!result.success) {
            return data({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { tweetId: targetTweetId, collectionId: targetCollectionId } = result.data;
        const userId = session.user.id;

        // 트윗 존재 여부 확인
        const tweet = await prisma.tweet.findUnique({
            where: { id: targetTweetId },
        });

        if (!tweet) {
            return data({ error: "트윗을 찾을 수 없습니다." }, { status: 404 });
        }

        // 이미 북마크를 눌렀는지 확인
        const existingBookmark = await prisma.bookmark.findUnique({
            where: {
                userId_tweetId: {
                    userId: userId,
                    tweetId: targetTweetId,
                },
            },
        });

        let bookmarked = false;

        if (existingBookmark) {
            // 이미 북마크가 있다면 삭제 (북마크 취소)
            await prisma.bookmark.delete({
                where: {
                    userId_tweetId: {
                        userId: userId,
                        tweetId: targetTweetId,
                    },
                },
            });
            bookmarked = false;
        } else {
            // 북마크가 없다면 생성 (북마크)
            await prisma.bookmark.create({
                data: {
                    userId: userId,
                    tweetId: targetTweetId,
                    collectionId: targetCollectionId === "none" ? null : targetCollectionId,
                },
            });
            bookmarked = true;
        }

        return data({
            success: true,
            bookmarked,
            message: bookmarked ? "북마크에 추가되었습니다." : "북마크가 취소되었습니다."
        }, { status: 200 });

    } catch (error) {
        console.error("Bookmark Action Error:", error);
        return data({ error: "북마크 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
