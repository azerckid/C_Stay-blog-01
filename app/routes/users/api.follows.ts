import { type ActionFunctionArgs, data } from "react-router";
import { auth } from "~/lib/auth";
import { db } from "~/db";
import { users, follows, notifications } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const followSchema = z.object({
    targetUserId: z.string().min(1),
    intent: z.enum(["toggle", "accept", "reject"]).optional().default("toggle"),
});

export const action = async ({ request }: ActionFunctionArgs) => {
    // 1. 세션 확인
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return data({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. 메서드 확인
    if (request.method !== "POST") {
        return data({ success: false, error: "잘못된 요청 메서드입니다." }, { status: 405 });
    }

    try {
        // 3. 데이터 검증
        const formData = await request.formData();
        const targetUserId = formData.get("targetUserId") as string;
        const intent = (formData.get("intent") as "toggle" | "accept" | "reject") || "toggle";

        const validation = followSchema.safeParse({ targetUserId, intent });

        if (!validation.success) {
            return data({ success: false, error: "유효하지 않은 데이터입니다." }, { status: 400 });
        }

        // 4. 자기 자신 팔로우/수락 방지
        if (userId === targetUserId) {
            return data({ success: false, error: "자기 자신을 대상으로 할 수 없습니다." }, { status: 400 });
        }

        // 5. 대상 유저 존재 여부 확인
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, targetUserId)
        });

        if (!targetUser) {
            return data({ success: false, error: "존재하지 않는 사용자입니다." }, { status: 404 });
        }

        // 6. Intent에 따른 로직 분기
        if (intent === "toggle") {
            // 기존 로직: 내가 상대를 팔로우/언팔로우
            const existingFollow = await db.query.follows.findFirst({
                where: and(
                    eq(follows.followerId, userId),
                    eq(follows.followingId, targetUserId)
                )
            });

            if (existingFollow) {
                // 언팔로우 또는 요청 취소
                await db.delete(follows).where(eq(follows.id, existingFollow.id));
                const message = existingFollow.status === "PENDING" ? "팔로우 요청이 취소되었습니다." : "언팔로우했습니다.";
                return data({ success: true, isFollowing: false, isPending: false, message });
            } else {
                // 팔로우 요청 또는 즉시 팔로우
                const isPrivate = (targetUser as any).isPrivate; // 타입 정의 이슈 회피
                const status = isPrivate ? "PENDING" : "ACCEPTED";

                await db.insert(follows).values({
                    id: crypto.randomUUID(),
                    followerId: userId,
                    followingId: targetUserId,
                    status: status,
                });

                // 알림 생성
                await db.insert(notifications).values({
                    id: crypto.randomUUID(),
                    recipientId: targetUserId,
                    issuerId: userId,
                    type: isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
                    isRead: false
                });

                if (isPrivate) {
                    return data({ success: true, isFollowing: false, isPending: true, message: "팔로우 요청을 보냈습니다." });
                } else {
                    return data({ success: true, isFollowing: true, isPending: false, message: "팔로우했습니다." });
                }
            }
        } else {
            // Accept/Reject 로직: 상대가 나를 팔로우한 요청을 처리
            // targetUserId가 요청자(Follower), userId가 나(Following)
            const existingRequest = await db.query.follows.findFirst({
                where: and(
                    eq(follows.followerId, targetUserId),
                    eq(follows.followingId, userId)
                )
            });

            if (!existingRequest) {
                return data({ success: false, error: "처리할 팔로우 요청이 없습니다." }, { status: 404 });
            }

            if (intent === "accept") {
                await db.update(follows)
                    .set({ status: "ACCEPTED" })
                    .where(eq(follows.id, existingRequest.id));

                // 요청이 수락되었다는 알림을 상대방에게 전송
                await db.insert(notifications).values({
                    id: crypto.randomUUID(),
                    recipientId: targetUserId,
                    issuerId: userId,
                    type: "FOLLOW_ACCEPTED",
                    isRead: false
                });

                return data({ success: true, message: "팔로우 요청을 수락했습니다." });
            } else if (intent === "reject") {
                await db.delete(follows).where(eq(follows.id, existingRequest.id));
                return data({ success: true, message: "팔로우 요청을 거절했습니다." });
            }
        }

        return data({ success: false, error: "알 수 없는 요청입니다." }, { status: 400 });

    } catch (error) {
        console.error("Follow error:", error);
        return data({ success: false, error: "팔로우 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
};
