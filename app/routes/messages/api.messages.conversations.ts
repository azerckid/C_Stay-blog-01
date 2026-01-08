import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, not, desc, isNull, inArray, count, sql } from "drizzle-orm";
import { pusher } from "~/lib/pusher.server";
import { getUserChannelId } from "~/lib/pusher-shared";
import { DateTime } from "luxon";
import { z } from "zod";

// 대화 생성 스키마
const createConversationSchema = z.object({
    userIds: z.array(z.string()).min(1, "최소 1명의 사용자가 필요합니다."),
    groupName: z.string().optional(),
});

/**
 * GET /api/messages/conversations
 * 대화 목록 조회
 * Query Params:
 *   - tab: "all" | "requests" (기본값: "all")
 */
export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const userId = session.user.id;
        const url = new URL(request.url);
        const tab = url.searchParams.get("tab") || "all"; // "all" | "requests"

        // 현재 사용자가 참여한 대화방 조회
        const participantRows = await db.query.dmParticipants.findMany({
            where: (p, { eq, isNull, and }) => and(eq(p.userId, userId), isNull(p.leftAt)),
            with: {
                conversation: {
                    with: {
                        participants: {
                            where: (p, { isNull, ne }) => and(ne(p.userId, userId), isNull(p.leftAt)),
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                        avatarUrl: true,
                                        isPrivate: true,
                                    }
                                }
                            }
                        },
                        messages: {
                            orderBy: (params, { desc }) => [desc(params.createdAt)],
                            limit: 1,
                            with: {
                                sender: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: (p, { desc }) => [desc(p.joinedAt)] // Approximation, ideally sort by conversation.lastMessageAt
        });

        // Sort by lastMessageAt manually as deep sort in relation is hard
        participantRows.sort((a, b) => {
            const dateA = new Date(a.conversation.lastMessageAt).getTime();
            const dateB = new Date(b.conversation.lastMessageAt).getTime();
            return dateB - dateA;
        });

        // Calculate unread counts separately or map. 
        // For unread counts, doing N queries is bad, but for now we will do a separate count query per conversation
        // or a single aggregated query if possible.
        // Let's simplified approach: fetch unread counts for all conversations user is in.

        const conversationIds = participantRows.map(p => p.conversationId);
        let unreadCountsMap: Record<string, number> = {};

        if (conversationIds.length > 0) {
            const unreadCounts = await db.select({
                conversationId: schema.directMessages.conversationId,
                count: count()
            })
                .from(schema.directMessages)
                .where(and(
                    inArray(schema.directMessages.conversationId, conversationIds),
                    eq(schema.directMessages.isRead, false),
                    not(eq(schema.directMessages.senderId, userId))
                ))
                .groupBy(schema.directMessages.conversationId);

            unreadCounts.forEach(c => {
                unreadCountsMap[c.conversationId as string] = c.count;
            });
        }

        const conversations = participantRows.map(p => ({
            ...p.conversation,
            unreadCount: unreadCountsMap[p.conversationId] || 0
        }));

        // 필터링: tab에 따라 isAccepted 값으로 필터
        let filteredConversations = conversations;

        if (tab === "requests") {
            // 요청 탭: 수락되지 않았고, 마지막 메시지를 '다른 사람'이 보낸 경우 (내가 받은 요청)
            filteredConversations = filteredConversations.filter((c) => {
                const lastMsg = c.messages[0];
                return !c.isAccepted && lastMsg && lastMsg.senderId !== userId;
            });
        } else {
            // 전체 탭: 수락되었거나, 수락되지 않았더라도 '내가' 마지막 메시지를 보낸 경우 (내가 보낸 요청)
            filteredConversations = filteredConversations.filter((c) => {
                const lastMsg = c.messages[0];
                return c.isAccepted || (lastMsg && lastMsg.senderId === userId);
            });
        }

        // 포맷팅
        const formattedConversations = filteredConversations.map((conv) => {
            const otherParticipants = conv.participants;
            const lastMessage = conv.messages[0] || null;

            return {
                id: conv.id,
                isGroup: conv.isGroup,
                groupName: conv.groupName,
                isAccepted: conv.isAccepted,
                lastMessageAt: conv.lastMessageAt,
                createdAt: conv.createdAt,
                unreadCount: conv.unreadCount,
                participants: otherParticipants.map((p) => ({
                    id: p.id,
                    conversationId: p.conversationId,
                    userId: p.userId,
                    joinedAt: p.joinedAt,
                    isAdmin: p.isAdmin,
                    user: {
                        id: p.user.id,
                        name: p.user.name || "알 수 없음",
                        email: p.user.email,
                        image: p.user.image || p.user.avatarUrl,
                        isPrivate: p.user.isPrivate,
                    }
                })),
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        content: lastMessage.content,
                        senderId: lastMessage.senderId,
                        senderName: lastMessage.sender.name || "알 수 없음",
                        createdAt: DateTime.fromISO(lastMessage.createdAt)
                            .setLocale("ko")
                            .toRelative() || "방금 전",
                        fullCreatedAt: DateTime.fromISO(lastMessage.createdAt)
                            .setLocale("ko")
                            .toLocaleString(DateTime.DATETIME_MED),
                        isRead: lastMessage.isRead,
                    }
                    : null,
            };
        });

        return data({ conversations: formattedConversations });
    } catch (error) {
        console.error("Conversations Loader Error:", error);
        return data({ error: "대화 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

/**
 * POST /api/messages/conversations
 * 1:1 또는 그룹 대화 생성
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
        const validated = createConversationSchema.parse(body);
        const { userIds, groupName } = validated;

        // 자기 자신은 제외하고 고유한 사용자 ID만
        const uniqueUserIds = Array.from(new Set(userIds.filter((id) => id !== userId)));

        if (uniqueUserIds.length === 0) {
            return data({ error: "최소 1명의 다른 사용자가 필요합니다." }, { status: 400 });
        }

        // 1:1 대화인지 그룹 대화인지 확인
        const isGroup = uniqueUserIds.length > 1 || groupName !== undefined;

        // 이미 존재하는 1:1 대화가 있는지 확인 (1:1만 확인)
        if (!isGroup && uniqueUserIds.length === 1) {
            const otherUserId = uniqueUserIds[0];

            // 양쪽 모두 참여한 1:1 대화 찾기
            // Find shared conversation IDs
            const myConvos = await db.select({ id: schema.dmParticipants.conversationId })
                .from(schema.dmParticipants)
                .where(and(eq(schema.dmParticipants.userId, userId), isNull(schema.dmParticipants.leftAt)));

            const otherConvos = await db.select({ id: schema.dmParticipants.conversationId })
                .from(schema.dmParticipants)
                .where(and(eq(schema.dmParticipants.userId, otherUserId), isNull(schema.dmParticipants.leftAt)));

            const validConvoIds = myConvos
                .map(c => c.id)
                .filter(id => otherConvos.map(oc => oc.id).includes(id));

            if (validConvoIds.length > 0) {
                // Check if any is strict 1:1 (non-group)
                const existingConv = await db.query.dmConversations.findFirst({
                    where: (c, { inArray, and, eq }) =>
                        and(
                            inArray(c.id, validConvoIds),
                            eq(c.isGroup, false)
                        ),
                    with: {
                        participants: {
                            where: (p, { isNull }) => isNull(p.leftAt),
                            with: {
                                user: true
                            }
                        }
                    }
                });

                // 정확히 2명만 참여하고, 양쪽 모두 나가지 않은 경우
                if (existingConv && existingConv.participants.length === 2) {
                    const params = existingConv.participants.map((p) => p.userId);
                    if (params.includes(userId) && params.includes(otherUserId)) {
                        // 클라이언트 포맷으로 변환하여 반환
                        const formattedConv = {
                            ...existingConv,
                            participants: existingConv.participants.map((p: any) => ({
                                ...p,
                                user: {
                                    ...p.user,
                                    image: p.user.image || p.user.avatarUrl,
                                }
                            }))
                        };

                        return data({
                            success: true,
                            conversation: formattedConv,
                        });
                    }
                }
            }
        }

        // 새 대화 생성
        const conversationId = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.transaction(async (tx) => {
            // 1. Conversation Create
            await tx.insert(schema.dmConversations).values({
                id: conversationId,
                isGroup: isGroup,
                groupName: isGroup ? groupName || null : null,
                isAccepted: false,
                lastMessageAt: now,
                createdAt: now,
                updatedAt: now
            });

            // 2. Participants Create
            const participantsData = [
                { userId, isAdmin: isGroup },
                ...uniqueUserIds.map((uid) => ({ userId: uid, isAdmin: false }))
            ];

            for (const p of participantsData) {
                await tx.insert(schema.dmParticipants).values({
                    id: crypto.randomUUID(),
                    conversationId: conversationId,
                    userId: p.userId,
                    isAdmin: p.isAdmin,
                    joinedAt: now
                });
            }
        });

        // 3. Fetch created conversation for response and pusher
        const conversation = await db.query.dmConversations.findFirst({
            where: (c, { eq }) => eq(c.id, conversationId),
            with: {
                participants: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                avatarUrl: true,
                                isPrivate: true
                            }
                        }
                    }
                }
            }
        });

        if (!conversation) throw new Error("Conversation creation failed");

        // Pusher 이벤트: 새 대화 생성 알림을 참여자들에게 전송
        try {
            const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);
            for (const participant of otherParticipants) {
                await pusher.trigger(getUserChannelId(participant.userId), "new-conversation", {
                    conversationId: conversation.id,
                    isGroup: conversation.isGroup,
                    groupName: conversation.groupName,
                });
            }
        } catch (pusherError) {
            console.error("Pusher trigger error:", pusherError);
        }

        return data({
            success: true,
            conversation: {
                id: conversation.id,
                isGroup: conversation.isGroup,
                groupName: conversation.groupName,
                isAccepted: conversation.isAccepted,
                participants: conversation.participants.map((p: any) => ({
                    id: p.user.id,
                    name: p.user.name || "알 수 없음",
                    username: p.user.email.split("@")[0],
                    image: p.user.image || p.user.avatarUrl,
                    isPrivate: p.user.isPrivate,
                })),
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Create Conversation Error:", error);
        return data({ error: "대화 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}

