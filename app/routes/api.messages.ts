import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { pusher } from "~/lib/pusher.server";
import { getConversationChannelId, getUserChannelId } from "~/lib/pusher-shared";
import { z } from "zod";

// 메시지 전송 스키마
const sendMessageSchema = z.object({
    conversationId: z.string().min(1, "대화방 ID가 필요합니다."),
    content: z.string().min(1, "메시지 내용을 입력해주세요.").max(10000, "메시지는 10000자 이내여야 합니다."),
});

/**
 * POST /api/messages
 * 메시지 전송
 */
export async function action({ request }: ActionFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        if (request.method !== "POST") {
            return data({ error: "Method Not Allowed" }, { status: 405 });
        }

        const userId = session.user.id;
        const body = await request.json();

        // 스키마 검증
        const validated = sendMessageSchema.parse(body);
        const { conversationId, content } = validated;

        // 현재 사용자가 참여한 대화인지 확인
        const participant = await prisma.dMParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
            include: {
                conversation: true,
            },
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        // 메시지 전송 시 대화를 자동으로 수락 (요청 상태였다면)
        const isAccepted = participant.conversation.isAccepted || false;
        if (!isAccepted) {
            await prisma.dMConversation.update({
                where: { id: conversationId },
                data: { isAccepted: true },
            });
        }

        // 메시지 생성
        const message = await prisma.directMessage.create({
            data: {
                conversationId,
                senderId: userId,
                content,
                isRead: false,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // 대화방의 lastMessageAt 업데이트 및 참여자 조회
        const updatedConversation = await prisma.dMConversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: message.createdAt },
            include: {
                participants: {
                    where: { leftAt: null },
                    select: { userId: true },
                },
            },
        });

        // Pusher 이벤트 트리거: 대화방 채널에 새 메시지 알림
        const formattedMessage = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            sender: {
                id: message.sender.id,
                name: message.sender.name || "알 수 없음",
                username: message.sender.email.split("@")[0],
                image: message.sender.image || message.sender.avatarUrl,
            },
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
        };

        try {
            // 대화방 채널에 새 메시지 이벤트 전송
            await pusher.trigger(getConversationChannelId(conversationId), "new-message", {
                message: formattedMessage,
                conversationId,
            });

            // 발신자를 제외한 다른 참여자들에게만 알림 전송
            const otherParticipants = updatedConversation.participants.filter(
                (p) => p.userId !== userId
            );

            for (const participant of otherParticipants) {
                await pusher.trigger(getUserChannelId(participant.userId), "new-message-notification", {
                    conversationId,
                    messageId: message.id,
                });
            }
        } catch (pusherError) {
            // Pusher 오류는 로그만 남기고 메시지 전송은 성공으로 처리
            console.error("Pusher trigger error:", pusherError);
        }

        return data({
            success: true,
            message: formattedMessage,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Send Message Error:", error);
        return data({ error: "메시지 전송 중 오류가 발생했습니다." }, { status: 500 });
    }
}

