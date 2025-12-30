import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { auth } from "~/lib/auth";
import { z } from "zod";

const followSchema = z.object({
    targetUserId: z.string().min(1),
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

        const validation = followSchema.safeParse({ targetUserId });

        if (!validation.success) {
            return data({ success: false, error: "유효하지 않은 데이터입니다." }, { status: 400 });
        }

        // 4. 자기 자신 팔로우 방지
        if (userId === targetUserId) {
            return data({ success: false, error: "자기 자신을 팔로우할 수 없습니다." }, { status: 400 });
        }

        // 5. 대상 유저 존재 여부 확인
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) {
            return data({ success: false, error: "존재하지 않는 사용자입니다." }, { status: 404 });
        }

        // 6. 팔로우 상태 확인 및 토글
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUserId,
                },
            },
        });

        if (existingFollow) {
            // 언팔로우 또는 요청 취소
            await prisma.follow.delete({
                where: {
                    id: existingFollow.id,
                },
            });
            const message = existingFollow.status === "PENDING" ? "팔로우 요청이 취소되었습니다." : "언팔로우했습니다.";
            return data({ success: true, isFollowing: false, isPending: false, message });
        } else {
            // 팔로우 요청 또는 즉시 팔로우
            const isPrivate = (targetUser as any).isPrivate; // 타입 정의 이슈 회피
            const status = isPrivate ? "PENDING" : "ACCEPTED";

            await prisma.follow.create({
                data: {
                    followerId: userId,
                    followingId: targetUserId,
                    status: status,
                },
            });

            // 알림 생성
            await prisma.notification.create({
                data: {
                    recipientId: targetUserId,
                    issuerId: userId,
                    type: isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
                },
            });

            if (isPrivate) {
                return data({ success: true, isFollowing: false, isPending: true, message: "팔로우 요청을 보냈습니다." });
            } else {
                return data({ success: true, isFollowing: true, isPending: false, message: "팔로우했습니다." });
            }
        }

    } catch (error) {
        console.error("Follow error:", error);
        return data({ success: false, error: "팔로우 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
};
