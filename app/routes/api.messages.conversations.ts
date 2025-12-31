import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { pusher, getConversationChannelId, getUserChannelId } from "~/lib/pusher.server";
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
        const participants = await prisma.dMParticipant.findMany({
            where: {
                userId,
                leftAt: null, // 나가지 않은 대화만
            },
            include: {
                conversation: {
                    include: {
                        participants: {
                            where: { userId: { not: userId }, leftAt: null }, // 상대방만 (나가지 않은)
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                        avatarUrl: true,
                                        isPrivate: true,
                                    },
                                },
                            },
                        },
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 1, // 마지막 메시지 1개만
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                conversation: {
                    lastMessageAt: "desc",
                },
            },
        });

        // 필터링: tab에 따라 isAccepted 값으로 필터
        let filteredConversations = participants.map((p) => p.conversation);

        if (tab === "requests") {
            filteredConversations = filteredConversations.filter((c) => !c.isAccepted);
        } else {
            filteredConversations = filteredConversations.filter((c) => c.isAccepted);
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
                lastMessageAt: conv.lastMessageAt.toISOString(),
                createdAt: conv.createdAt.toISOString(),
                participants: otherParticipants.map((p) => ({
                    id: p.user.id,
                    name: p.user.name || "알 수 없음",
                    username: p.user.email.split("@")[0],
                    image: p.user.image || p.user.avatarUrl,
                    isPrivate: p.user.isPrivate,
                })),
                lastMessage: lastMessage
                    ? {
                          id: lastMessage.id,
                          content: lastMessage.content,
                          senderId: lastMessage.senderId,
                          senderName: lastMessage.sender.name || "알 수 없음",
                          createdAt: DateTime.fromJSDate(lastMessage.createdAt)
                              .setLocale("ko")
                              .toRelative() || "방금 전",
                          fullCreatedAt: DateTime.fromJSDate(lastMessage.createdAt)
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
            const existingConv = await prisma.dMConversation.findFirst({
                where: {
                    isGroup: false,
                    AND: [
                        {
                            participants: {
                                some: { userId },
                            },
                        },
                        {
                            participants: {
                                some: { userId: otherUserId },
                            },
                        },
                    ],
                },
                include: {
                    participants: {
                        where: { leftAt: null }, // 나가지 않은 참여자만
                    },
                },
            });

            // 정확히 2명만 참여하고, 양쪽 모두 나가지 않은 경우
            if (existingConv && existingConv.participants.length === 2) {
                const participantIds = existingConv.participants.map((p) => p.userId);
                if (participantIds.includes(userId) && participantIds.includes(otherUserId)) {
                    return data({
                        success: true,
                        conversation: {
                            id: existingConv.id,
                            isGroup: existingConv.isGroup,
                            isAccepted: existingConv.isAccepted,
                        },
                    });
                }
            }
        }

        // 새 대화 생성
        const conversation = await prisma.dMConversation.create({
            data: {
                isGroup,
                groupName: isGroup ? groupName || null : null,
                isAccepted: false, // 초기에는 요청 상태
                participants: {
                    create: [
                        { userId, isAdmin: isGroup }, // 그룹이면 생성자가 관리자
                        ...uniqueUserIds.map((uid) => ({ userId: uid, isAdmin: false })),
                    ],
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                avatarUrl: true,
                                isPrivate: true,
                            },
                        },
                    },
                },
            },
        });

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
                participants: conversation.participants.map((p) => ({
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

