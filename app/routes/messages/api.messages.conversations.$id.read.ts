import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { dmParticipants, directMessages } from "~/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
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
        const participant = await db.query.dmParticipants.findFirst({
            where: and(
                eq(dmParticipants.conversationId, conversationId),
                eq(dmParticipants.userId, userId)
            )
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        // 내가 받은 메시지 중 읽지 않은 메시지들을 모두 읽음 처리
        // In Drizzle, we can select IDs first or update directly if logic permits.
        // Drizzle `update` returns updated records when using `.returning()`.
        // Here we need `unreadMessages` IDs for Pusher.
        // So fetching IDs first is key.
        const unreadMessages = await db.query.directMessages.findMany({
            where: and(
                eq(directMessages.conversationId, conversationId),
                ne(directMessages.senderId, userId), // 내가 보낸 메시지 제외
                eq(directMessages.isRead, false)
            ),
            columns: { id: true },
        });

        if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(m => m.id);

            await db.update(directMessages)
                .set({ isRead: true })
                .where(inArray(directMessages.id, messageIds));

            // Pusher 이벤트 트리거: 상대방(메시지 발신자)에게 읽음 처리 알림
            try {
                await pusher.trigger(getConversationChannelId(conversationId), "message-read", {
                    conversationId,
                    readBy: userId,
                    messageIds: messageIds,
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

