import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";

/**
 * GET /api/users/search
 * 사용자 검색 및 추천 (쪽지 대상 선택용)
 * Query Params:
 *   - q: 검색어 (이름 또는 이메일)
 */
export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const session = await getSession(request);
        if (!session?.user) {
            return data({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const currentUserId = session.user.id;
        const url = new URL(request.url);
        const query = url.searchParams.get("q")?.trim();

        let users;

        if (query) {
            // 검색어가 있을 때: 검색 결과
            users = await prisma.user.findMany({
                where: {
                    id: { not: currentUserId }, // 본인 제외
                    OR: [
                        { name: { contains: query } },
                        { email: { contains: query } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    avatarUrl: true,
                    isPrivate: true,
                    _count: {
                        select: { followedBy: true },
                    },
                },
                take: 20,
            });
        } else {
            // 검색어가 없을 때: 내가 팔로우하는 사람 (추천)
            const following = await prisma.follow.findMany({
                where: {
                    followerId: currentUserId,
                },
                include: {
                    following: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            avatarUrl: true,
                            isPrivate: true,
                            _count: {
                                select: { followedBy: true },
                            },
                        },
                    },
                },
                take: 20,
                orderBy: { createdAt: "desc" },
            });

            users = following.map((f) => f.following);
        }

        // 클라이언트 포맷으로 변환
        const formattedUsers = users.map((user) => ({
            id: user.id,
            name: user.name || "알 수 없음",
            email: user.email,
            image: user.image || user.avatarUrl,
            isPrivate: user.isPrivate,
            followerCount: user._count.followedBy,
            isVerified: false, // 임시 (실제 인증 로직이 있다면 연동)
        }));

        return data({ users: formattedUsers });
    } catch (error) {
        console.error("User Search Error:", error);
        return data({ error: "사용자를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}
