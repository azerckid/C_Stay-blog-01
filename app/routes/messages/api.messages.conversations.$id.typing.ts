import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { eq, and } from "drizzle-orm";
import { pusher } from "~/lib/pusher.server";
import { getConversationChannelId } from "~/lib/pusher-shared";
import { z } from "zod";

const typingSchema = z.object({
    isTyping: z.boolean(),
});

/**
 * POST /api/messages/conversations/:id/typing
 * 타이핑 인디케이터 전송
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
            where: (p, { and, eq }) =>
                and(
                    eq(p.conversationId, conversationId),
                    eq(p.userId, userId)
                ),
            with: {
                conversation: {
                    with: {
                        participants: {
                            where: (p, { isNull }) => isNull(p.leftAt),
                            columns: { userId: true }
                        }
                    }
                }
            }
        });

        if (!participant || participant.leftAt !== null) {
            return data({ error: "대화방에 접근할 수 없습니다." }, { status: 403 });
        }

        const body = await request.json();
        const validated = typingSchema.parse(body);
        const { isTyping } = validated;

        // Pusher 이벤트 트리거: 상대방에게 타이핑 상태 전송
        try {
            await pusher.trigger(getConversationChannelId(conversationId), "typing", {
                conversationId,
                userId,
                isTyping,
            });
        } catch (pusherError) {
            console.error("Pusher trigger error:", pusherError);
        }

        return data({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Typing Indicator Error:", error);
        return data({ error: "타이핑 인디케이터 전송 중 오류가 발생했습니다." }, { status: 500 });
    }
}

