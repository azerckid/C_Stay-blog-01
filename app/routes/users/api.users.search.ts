import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, not, like, sql } from "drizzle-orm";

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

        if (query) {
            // 검색어가 있을 때: 검색 결과
            const usersData = await db.query.users.findMany({
                where: (users, { and, or, not, like, eq }) =>
                    and(
                        not(eq(users.id, currentUserId)), // 본인 제외
                        or(
                            like(users.name, `%${query}%`),
                            like(users.email, `%${query}%`)
                        )
                    ),
                limit: 20
            });

            // 포맷팅 및 팔로워 수 집계
            const formattedUsers = await Promise.all(usersData.map(async (user) => {
                const [{ count: followerCount }] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.follows)
                    .where(eq(schema.follows.followingId, user.id));

                return {
                    id: user.id,
                    name: user.name || "알 수 없음",
                    email: user.email,
                    image: user.image || user.avatarUrl,
                    isPrivate: user.isPrivate,
                    followerCount: followerCount,
                    isVerified: false,
                };
            }));

            return data({ users: formattedUsers });
        } else {
            // 검색어가 없을 때: 내가 팔로우하는 사람 (추천)
            const following = await db.query.follows.findMany({
                where: (follows, { eq }) => eq(follows.followerId, currentUserId),
                with: {
                    following: true
                },
                limit: 20,
                orderBy: (follows, { desc }) => [desc(follows.createdAt)],
            });

            const formattedUsers = await Promise.all(following
                .filter(f => f.following) // Filter out nulls
                .map(async (f) => {
                    const user = f.following;
                    if (!user) return null; // Should be handled by filter but for type safety

                    const [{ count: followerCount }] = await db
                        .select({ count: sql<number>`count(*)` })
                        .from(schema.follows)
                        .where(eq(schema.follows.followingId, user.id));

                    return {
                        id: user.id,
                        name: user.name || "알 수 없음",
                        email: user.email,
                        image: user.image || user.avatarUrl,
                        isPrivate: user.isPrivate,
                        followerCount: followerCount,
                        isVerified: false,
                    };
                }));

            return data({ users: formattedUsers.filter(Boolean) });
        }
    } catch (error) {
        console.error("User Search Error:", error);
        return data({ error: "사용자를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}
