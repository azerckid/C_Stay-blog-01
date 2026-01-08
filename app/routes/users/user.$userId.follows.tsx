import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useSearchParams, Link, useNavigate } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { users, follows } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { UserCard } from "~/components/user/user-card";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [{ title: `${data?.targetUser.name}님의 팔로우 정보 / STAYnC` }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await getSession(request);
    const currentUserId = session?.user?.id;
    const targetUserId = params.userId;
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "followers"; // 'followers' | 'following'

    if (!targetUserId) throw new Response("User Required", { status: 404 });

    const targetUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { id: true, name: true, email: true }
    });

    if (!targetUser) throw new Response("User Not Found", { status: 404 });

    let usersList: any[] = [];

    if (tab === "followers") {
        const followersList = await db.query.follows.findMany({
            where: eq(follows.followingId, targetUserId),
            with: {
                follower: {
                    with: {
                        followedBy: currentUserId ? {
                            where: (f, { eq }) => eq(f.followerId, currentUserId),
                            columns: { id: true }
                        } : undefined
                    }
                }
            }
        });
        usersList = followersList.map(f => ({
            ...f.follower,
            isFollowing: (f.follower.followedBy?.length ?? 0) > 0,
            isCurrentUser: f.follower.id === currentUserId
        }));
    } else {
        const followingList = await db.query.follows.findMany({
            where: eq(follows.followerId, targetUserId),
            with: {
                following: {
                    with: {
                        followedBy: currentUserId ? {
                            where: (f, { eq }) => eq(f.followerId, currentUserId),
                            columns: { id: true }
                        } : undefined
                    }
                }
            }
        });
        usersList = followingList.map(f => ({
            ...f.following,
            isFollowing: (f.following.followedBy?.length ?? 0) > 0,
            isCurrentUser: f.following.id === currentUserId
        }));
    }

    const formattedUsers = usersList.map(user => ({
        id: user.id,
        name: user.name,
        username: user.email.split("@")[0],
        image: user.image,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isFollowing: user.isFollowing,
        isCurrentUser: user.isCurrentUser
    }));

    return { targetUser, users: formattedUsers, tab };
}

export default function UserFollowsPage() {
    const { targetUser, users, tab } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="h-5 w-5" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold">{targetUser.name}</h1>
                    <span className="text-xs text-muted-foreground">@{targetUser.email.split("@")[0]}</span>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-border">
                <Link
                    to={`?tab=followers`}
                    replace
                    className="flex-1 hover:bg-accent/50 transition-colors relative"
                >
                    <div className="flex justify-center items-center py-4">
                        <span className={cn(
                            "font-medium",
                            tab === "followers" ? "font-bold text-foreground" : "text-muted-foreground"
                        )}>
                            팔로워
                        </span>
                        {tab === "followers" && (
                            <div className="absolute bottom-0 w-14 h-1 bg-primary rounded-full" />
                        )}
                    </div>
                </Link>
                <Link
                    to={`?tab=following`}
                    replace
                    className="flex-1 hover:bg-accent/50 transition-colors relative"
                >
                    <div className="flex justify-center items-center py-4">
                        <span className={cn(
                            "font-medium",
                            tab === "following" ? "font-bold text-foreground" : "text-muted-foreground"
                        )}>
                            팔로잉
                        </span>
                        {tab === "following" && (
                            <div className="absolute bottom-0 w-14 h-1 bg-primary rounded-full" />
                        )}
                    </div>
                </Link>
            </div>

            <main className="flex-1">
                {users.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {tab === "followers" ? "아직 팔로워가 없습니다." : "아직 팔로우 중인 사용자가 없습니다."}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {users.map((user: any) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                isCurrentUser={user.isCurrentUser}
                                isFollowing={user.isFollowing}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
