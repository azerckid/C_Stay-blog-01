import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { pusher, getConversationChannelId } from "~/lib/pusher.server";

/**
 * PATCH /api/messages/:id/read
 * 메시지 읽음 처리
 */
export async function action({ request, params }: ActionFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        if (request.method !== "PATCH") {
            return data({ error: "Method Not Allowed" }, { status: 405 });
        }

        const userId = session.user.id;
        const messageId = params.id;

        if (!messageId) {
            return data({ error: "메시지 ID가 필요합니다." }, { status: 400 });
        }

        // 메시지 조회
        const message = await prisma.directMessage.findUnique({
            where: { id: messageId },
            include: {
                conversation: {
                    include: {
                        participants: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!message) {
            return data({ error: "메시지를 찾을 수 없습니다." }, { status: 404 });
        }

        // 본인이 보낸 메시지는 읽음 처리하지 않음
        if (message.senderId === userId) {
            return data({ error: "본인이 보낸 메시지는 읽음 처리할 수 없습니다." }, { status: 400 });
        }

        // 현재 사용자가 대화에 참여했는지 확인
        const participant = message.conversation.participants[0];
        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        // 이미 읽음 처리된 메시지는 그대로 반환
        if (message.isRead) {
            return data({
                success: true,
                message: {
                    id: message.id,
                    isRead: true,
                },
            });
        }

        // 읽음 처리
        const updatedMessage = await prisma.directMessage.update({
            where: { id: messageId },
            data: { isRead: true },
            include: {
                conversation: true,
            },
        });

        // Pusher 이벤트 트리거: 대화방 채널에 읽음 처리 알림
        try {
            await pusher.trigger(
                getConversationChannelId(message.conversationId),
                "message-read",
                {
                    messageId: updatedMessage.id,
                    conversationId: message.conversationId,
                    readBy: userId,
                }
            );
        } catch (pusherError) {
            // Pusher 오류는 로그만 남기고 읽음 처리您是 성공으로 처리
            console.error("Pusher trigger error:", pusherError);
        }

        return data({
            success: true,
            message: {
                id: updatedMessage.id,
                isRead: updatedMessage.isRead,
            },
        });
    } catch (error) {
        console.error("Read Message Error:", error);
        return data({ error: "읽음 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}

