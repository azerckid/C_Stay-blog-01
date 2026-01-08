import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = 20;

    const notificationsData = await db.query.notifications.findMany({
        where: (notifications, { eq }) => eq(notifications.recipientId, userId),
        limit: limit,
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
        with: {
            issuer: {
                columns: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                }
            },
            tweet: {
                columns: {
                    id: true,
                    content: true,
                }
            }
        }
    });

    const [{ count: unreadCount }] = await db
        .select({ count: count() })
        .from(schema.notifications)
        .where(and(eq(schema.notifications.recipientId, userId), eq(schema.notifications.isRead, false)));

    return data({ notifications: notificationsData, unreadCount });
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;

    if (request.method === "POST") {
        try {
            const formData = await request.formData();
            const notificationId = formData.get("id") as string;

            if (notificationId) {
                // 단일 알림 읽음 처리
                await db.update(schema.notifications)
                    .set({ isRead: true })
                    .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.recipientId, userId)));
            } else {
                // 모든 알림 읽음 처리
                await db.update(schema.notifications)
                    .set({ isRead: true })
                    .where(and(eq(schema.notifications.recipientId, userId), eq(schema.notifications.isRead, false)));
            }

            return data({ success: true });
        } catch (error) {
            console.error("Notification update error:", error);
            return data({ error: "알림 업데이트 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    if (request.method === "DELETE") {
        try {
            const formData = await request.formData();
            const notificationId = formData.get("id") as string;
            const type = formData.get("type") as string; // 'all' or undefined

            if (type === "all") {
                // 모든 알림 삭제
                await db.delete(schema.notifications)
                    .where(eq(schema.notifications.recipientId, userId));
                return data({ success: true, message: "모든 알림이 삭제되었습니다." });
            } else if (notificationId) {
                // 단일 알림 삭제
                await db.delete(schema.notifications)
                    .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.recipientId, userId)));
                return data({ success: true, message: "알림이 삭제되었습니다." });
            }

            return data({ error: "삭제할 알림 정보가 없습니다." }, { status: 400 });

        } catch (error) {
            console.error("Notification delete error:", error);
            // Record not found: Drizzle throws error if record doesn't exist, general error handling is sufficient
            return data({ error: "알림 삭제 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    return data({ error: "Method Not Allowed" }, { status: 405 });
}
