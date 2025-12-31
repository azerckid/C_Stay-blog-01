import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { pusher } from "~/lib/pusher.server";
import { getConversationChannelId, getUserChannelId } from "~/lib/pusher-shared";
import { z } from "zod";

// 메시지 전송 스키마
const sendMessageSchema = z.object({
    conversationId: z.string().min(1, "대화방 ID가 필요합니다."),
    content: z.string().min(0).max(10000, "메시지는 10000자 이내여야 합니다.").optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
}).refine((data) => {
    const hasContent = data.content && typeof data.content === 'string' && data.content.trim().length > 0;
    const hasMedia = data.mediaUrl && typeof data.mediaUrl === 'string' && data.mediaUrl.length > 0;
    return hasContent || hasMedia;
}, {
    message: "메시지 내용 또는 미디어가 필요합니다.",
    path: ["content"],
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
        
        // Content-Type 확인
        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("[API] Invalid content-type:", contentType);
            return data({ error: "Content-Type must be application/json" }, { status: 400 });
        }
        
        let body;
        try {
            body = await request.json();
        } catch (error) {
            console.error("[API] Failed to parse JSON:", error);
            return data({ error: "Invalid JSON format" }, { status: 400 });
        }

        // 스키마 검증
        const validated = sendMessageSchema.parse(body);
        const { conversationId, content, mediaUrl, mediaType } = validated;
        
        // content가 undefined이면 빈 문자열로 변환
        const finalContent = content ?? "";

        // 디버깅: 받은 데이터 확인
        console.log("[API] Received message data:", {
            conversationId,
            content: content || "(empty)",
            mediaUrl: mediaUrl || "(none)",
            mediaType: mediaType || "(none)",
        });

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

        // 메시지 전송 시 대화 수락 로직 (Twitter 스타일)
        // 1. 이미 수락된 상태면 패스
        // 2. 수락되지 않은 상태일 때:
        //    - 상대방이 보낸 메시지가 하나라도 있다면 -> 내가 답장하는 것이므로 '수락' 처리
        //    - 상대방이 보낸 메시지가 없다면 -> 내가 계속 요청을 보내는 것이므로 '수락 안 함' (요청 상태 유지)
        const isAccepted = participant.conversation.isAccepted || false;
        if (!isAccepted) {
            // 상대방이 보낸 메시지가 있는지 확인
            const otherMessagesCount = await prisma.directMessage.count({
                where: {
                    conversationId,
                    senderId: { not: userId },
                },
            });

            if (otherMessagesCount > 0) {
                await prisma.dMConversation.update({
                    where: { id: conversationId },
                    data: { isAccepted: true },
                });
            }
        }

        // 메시지 생성
        console.log("[API] Creating message with:", {
            mediaUrl: mediaUrl || "(none)",
            mediaType: mediaType || "(none)",
        });
        
        const message = await prisma.directMessage.create({
            data: {
                conversationId,
                senderId: userId,
                content: finalContent,
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null,
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
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
        };

        // 디버깅: mediaUrl이 포함되어 있는지 확인
        if (formattedMessage.mediaUrl) {
            console.log("[API] Sending message with media:", {
                messageId: formattedMessage.id,
                mediaUrl: formattedMessage.mediaUrl,
                mediaType: formattedMessage.mediaType,
            });
        }

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
            console.error("Zod validation error:", error.issues);
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Send Message Error:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        return data({ error: "메시지 전송 중 오류가 발생했습니다." }, { status: 500 });
    }
}

