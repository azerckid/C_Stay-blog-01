import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { pusher } from "~/lib/pusher.server";
import { getConversationChannelId } from "~/lib/pusher-shared";

/**
 * POST /api/messages/conversations/:id/read
 * 대화방의 모든 읽지 않은 메시지를 읽음 처리
 * (채팅방 진입 시 호출)
 */
export async function action({ request, params }: ActionFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        if (request.method !== "POST") {
            return data({ error: "Method Not Allowed" }, { status: 405 });
        }

        const userId = session.user.id;
        const conversationId = params.id;

        if (!conversationId) {
            return data({ error: "대화방 ID가 필요합니다." }, { status: 400 });
        }

        // 현재 사용자가 참여한 대화인지 확인
        const participant = await prisma.dMParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        // 내가 받은 메시지 중 읽지 않은 메시지들을 모두 읽음 처리
        const unreadMessages = await prisma.directMessage.findMany({
            where: {
                conversationId,
                senderId: { not: userId }, // 내가 보낸 메시지 제외
                isRead: false,
            },
            select: { id: true },
        });

        if (unreadMessages.length > 0) {
            await prisma.directMessage.updateMany({
                where: {
                    id: { in: unreadMessages.map((m) => m.id) },
                },
                data: { isRead: true },
            });

            // Pusher 이벤트 트리거: 상대방(메시지 발신자)에게 읽음 처리 알림
            try {
                await pusher.trigger(getConversationChannelId(conversationId), "message-read", {
                    conversationId,
                    readBy: userId,
                    messageIds: unreadMessages.map((m) => m.id),
                });
            } catch (pusherError) {
                console.error("Pusher trigger error:", pusherError);
            }
        }

        return data({
            success: true,
            readCount: unreadMessages.length,
        });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        return data({ error: "읽음 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}

