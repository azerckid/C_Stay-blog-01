import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
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

    const notifications = await prisma.notification.findMany({
        where: { recipientId: userId },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
            issuer: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                }
            },
            tweet: {
                select: {
                    id: true,
                    content: true,
                }
            }
        }
    });

    const unreadCount = await prisma.notification.count({
        where: { recipientId: userId, isRead: false }
    });

    return data({ notifications, unreadCount });
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
                await prisma.notification.update({
                    where: { id: notificationId, recipientId: userId },
                    data: { isRead: true }
                });
            } else {
                // 모든 알림 읽음 처리
                await prisma.notification.updateMany({
                    where: { recipientId: userId, isRead: false },
                    data: { isRead: true }
                });
            }

            return data({ success: true });
        } catch (error) {
            console.error("Notification update error:", error);
            return data({ error: "알림 업데이트 중 오류가 발생했습니다." }, { status: 500 });
        }
    }

    return data({ error: "Method Not Allowed" }, { status: 405 });
}
