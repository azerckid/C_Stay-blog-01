import { data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) return data({ error: "Unauthorized" }, { status: 401 });

    const collections = await prisma.bookmarkCollection.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        include: {
            _count: {
                select: { bookmarks: true }
            }
        }
    });

    return data({ collections });
}

const collectionSchema = z.object({
    name: z.string().min(1, "이름을 입력해주세요.").max(20, "이름은 20자 이내여야 합니다."),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) return data({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "create") {
        const name = formData.get("name") as string;
        try {
            collectionSchema.parse({ name });
            const collection = await prisma.bookmarkCollection.create({
                data: {
                    name,
                    userId: session.user.id,
                },
            });
            return data({ success: true, collection });
        } catch (error: any) {
            return data({ error: error.message || "생성 실패" }, { status: 400 });
        }
    }

    if (action === "delete") {
        const id = formData.get("id") as string;
        try {
            await prisma.bookmarkCollection.delete({
                where: { id, userId: session.user.id },
            });
            return data({ success: true });
        } catch (error) {
            return data({ error: "삭제 실패" }, { status: 400 });
        }
    }

    if (action === "update-bookmark") {
        const tweetId = formData.get("tweetId") as string;
        const collectionId = formData.get("collectionId") as string;

        try {
            // Upsert: Create if doesn't exist, update if exists
            await prisma.bookmark.upsert({
                where: {
                    userId_tweetId: {
                        userId: session.user.id,
                        tweetId: tweetId,
                    },
                },
                create: {
                    userId: session.user.id,
                    tweetId: tweetId,
                    collectionId: collectionId === "none" ? null : collectionId,
                },
                update: {
                    collectionId: collectionId === "none" ? null : collectionId,
                },
            });

            return data({ success: true });
        } catch (error) {
            console.error("Update bookmark error:", error);
            return data({ error: "이동 실패" }, { status: 400 });
        }
    }

    return data({ error: "Invalid action" }, { status: 400 });
}
