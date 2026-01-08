import { data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { bookmarkCollections, bookmarks } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) return data({ error: "Unauthorized" }, { status: 401 });

    const collections = await db.query.bookmarkCollections.findMany({
        where: eq(bookmarkCollections.userId, session.user.id),
        orderBy: [desc(bookmarkCollections.updatedAt)],
        with: {
            bookmarks: true // Fetching bookmarks to count length client-side or check length here
        }
    });

    const parsedCollections = collections.map((c: any) => ({
        ...c,
        _count: { bookmarks: c.bookmarks.length }
    }));

    return data({ collections: parsedCollections });
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
            const [collection] = await db.insert(bookmarkCollections).values({
                id: crypto.randomUUID(),
                name,
                userId: session.user.id,
                updatedAt: new Date().toISOString()
            }).returning();

            return data({ success: true, collection });
        } catch (error: any) {
            return data({ error: error.message || "생성 실패" }, { status: 400 });
        }
    }

    if (action === "delete") {
        const id = formData.get("id") as string;
        try {
            await db.delete(bookmarkCollections).where(and(
                eq(bookmarkCollections.id, id),
                eq(bookmarkCollections.userId, session.user.id)
            ));
            return data({ success: true });
        } catch (error) {
            return data({ error: "삭제 실패" }, { status: 400 });
        }
    }

    if (action === "update-bookmark") {
        const tweetId = formData.get("tweetId") as string;
        const collectionId = formData.get("collectionId") as string;
        const userId = session.user.id;

        try {
            // Upsert Logic manually
            const existing = await db.query.bookmarks.findFirst({
                where: and(
                    eq(bookmarks.userId, userId),
                    eq(bookmarks.tweetId, tweetId)
                )
            });

            if (existing) {
                await db.update(bookmarks)
                    .set({ collectionId: collectionId === "none" ? null : collectionId })
                    .where(eq(bookmarks.id, existing.id));
            } else {
                await db.insert(bookmarks).values({
                    id: crypto.randomUUID(),
                    userId: userId,
                    tweetId: tweetId,
                    collectionId: collectionId === "none" ? null : collectionId,
                });
            }

            return data({ success: true });
        } catch (error) {
            console.error("Update bookmark error:", error);
            return data({ error: "이동 실패" }, { status: 400 });
        }
    }

    return data({ error: "Invalid action" }, { status: 400 });
}
