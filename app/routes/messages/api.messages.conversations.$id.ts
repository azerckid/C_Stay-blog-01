import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, not, lt, desc } from "drizzle-orm";
import { pusher } from "~/lib/pusher.server";
import { getConversationChannelId, getUserChannelId } from "~/lib/pusher-shared";
import { DateTime } from "luxon";

/**
 * GET /api/messages/conversations/:id
 * 특정 대화방의 메시지 조회 (무한 스크롤)
 * Query Params:
 *   - cursor: ISO string (마지막 메시지의 createdAt)
 *   - limit: number (기본값: 50)
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const userId = session.user.id;
        const conversationId = params.id;

        if (!conversationId) {
            return data({ error: "대화방 ID가 필요합니다." }, { status: 400 });
        }

        // 현재 사용자가 참여한 대화인지 확인
        const participant = await db.query.dmParticipants.findFirst({
            where: (participants, { and, eq }) =>
                and(
                    eq(participants.conversationId, conversationId),
                    eq(participants.userId, userId)
                )
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);

        // 메시지 조회 (커서 기반 페이지네이션)
        const messages = await db.query.directMessages.findMany({
            where: (messages, { and, or, eq, lt, ne }) => {
                const conditions = [
                    eq(messages.conversationId, conversationId),
                    // 삭제되지 않은 메시지 조건
                    or(
                        and(eq(messages.senderId, userId), eq(messages.deletedBySender, false)),
                        and(ne(messages.senderId, userId), eq(messages.deletedByReceiver, false))
                    )
                ];

                if (cursor) {
                    conditions.push(lt(messages.createdAt, cursor));
                }

                return and(...conditions);
            },
            limit: limit + 1,
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            with: {
                sender: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        avatarUrl: true
                    }
                }
            }
        });

        const hasNextPage = messages.length > limit;
        const paginatedMessages = hasNextPage ? messages.slice(0, limit) : messages;
        const nextCursor =
            paginatedMessages.length > 0
                ? paginatedMessages[paginatedMessages.length - 1].createdAt
                : null;

        // 포맷팅 (최신순이므로 reverse)
        const formattedMessages = paginatedMessages.reverse().map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            sender: {
                id: msg.sender.id,
                name: msg.sender.name || "알 수 없음",
                username: msg.sender.email.split("@")[0],
                image: msg.sender.image || msg.sender.avatarUrl,
            },
            isRead: msg.isRead,
            createdAt: msg.createdAt,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.mediaType as any,
            fullCreatedAt: DateTime.fromISO(msg.createdAt)
                .setLocale("ko")
                .toLocaleString(DateTime.DATETIME_MED),
        }));

        return data({
            messages: formattedMessages,
            nextCursor: hasNextPage ? nextCursor : null,
        });
    } catch (error) {
        console.error("Messages Loader Error:", error);
        return data({ error: "메시지를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

/**
 * PATCH /api/messages/conversations/:id/accept
 * 메시지 요청 수락
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
        const conversationId = params.id;

        if (!conversationId) {
            return data({ error: "대화방 ID가 필요합니다." }, { status: 400 });
        }

        // 현재 사용자가 참여한 대화인지 확인
        const participant = await db.query.dmParticipants.findFirst({
            where: (participants, { and, eq }) =>
                and(
                    eq(participants.conversationId, conversationId),
                    eq(participants.userId, userId)
                ),
            with: { conversation: true }
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        // 이미 수락된 대화면 그대로 반환
        if (participant.conversation.isAccepted) {
            return data({
                success: true,
                conversation: {
                    id: participant.conversation.id,
                    isAccepted: true,
                },
            });
        }

        // 요청 수락 (isAccepted를 true로 변경)
        await db.update(schema.dmConversations)
            .set({ isAccepted: true })
            .where(eq(schema.dmConversations.id, conversationId));

        // Get participants for pusher
        const participants = await db.query.dmParticipants.findMany({
            where: (p, { eq, isNull }) => and(eq(p.conversationId, conversationId), isNull(p.leftAt)),
            columns: { userId: true }
        });

        // Pusher 이벤트: 대화 수락 알림 전송
        try {
            // 대화방 채널에 수락 이벤트 전송
            await pusher.trigger(getConversationChannelId(conversationId), "conversation-accepted", {
                conversationId,
                acceptedBy: userId,
            });

            // 다른 참여자들에게도 알림
            const otherParticipants = participants.filter(
                (p) => p.userId !== userId
            );
            for (const participant of otherParticipants) {
                await pusher.trigger(getUserChannelId(participant.userId), "conversation-accepted-notification", {
                    conversationId,
                });
            }
        } catch (pusherError) {
            console.error("Pusher trigger error:", pusherError);
        }

        return data({
            success: true,
            conversation: {
                id: conversationId,
                isAccepted: true,
            },
        });
    } catch (error) {
        console.error("Accept Conversation Error:", error);
        return data({ error: "요청 수락 중 오류가 발생했습니다." }, { status: 500 });
    }
}

