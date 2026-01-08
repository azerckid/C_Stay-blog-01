import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, data, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { auth } from "~/lib/auth";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, not, isNull, isNotNull, count, sql, desc, inArray } from "drizzle-orm";
import { FollowButton } from "~/components/user/follow-button";
import { TweetCard } from "~/components/tweet/tweet-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { cn } from "~/lib/utils";
import { ProfileEditDialog } from "~/components/user/profile-edit-dialog";
import { TravelMap } from "~/components/travel/travel-map";

// Utility function to safely extract username from email
const getUsername = (email: string | null | undefined): string => {
    return email?.split("@")[0] || "unknown";
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return [{ title: "사용자 프로필 / STAYnC" }];
    return [
        { title: `${data.profileUser.name} (@${getUsername(data.profileUser.email)}) / STAYnC` },
        { name: "description", content: data.profileUser.bio || "STAYnC 사용자 프로필" },
    ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "tweets";

    const userId = params.userId;
    if (!userId) throw new Response("User ID Required", { status: 400 });

    const profileUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
        with: {
            followedBy: {
                where: (follows, { eq }) => eq(follows.followerId, session?.user?.id || ""),
                columns: {
                    id: true,
                    status: true,
                }
            }
        }
    });

    if (!profileUser) {
        throw new Response("User Not Found", { status: 404 });
    }

    // Counts with filters
    const [{ followerCount, followingCount, tweetCount }] = await db.select({
        followerCount: sql<number>`(SELECT COUNT(*) FROM "Follow" WHERE "followingId" = ${userId} AND "status" = 'ACCEPTED')`,
        followingCount: sql<number>`(SELECT COUNT(*) FROM "Follow" WHERE "followerId" = ${userId} AND "status" = 'ACCEPTED')`,
        tweetCount: sql<number>`(SELECT COUNT(*) FROM "Tweet" WHERE "userId" = ${userId} AND "deletedAt" IS NULL)`,
    }).from(schema.users).where(eq(schema.users.id, userId));

    const profileUserWithCount = {
        ...profileUser,
        _count: {
            followedBy: followerCount || 0,
            following: followingCount || 0,
            tweets: tweetCount || 0,
        }
    };

    const isCurrentUser = session?.user?.id === profileUser.id;
    const followRecord = profileUser.followedBy?.[0];
    const isFollowing = followRecord?.status === "ACCEPTED";
    const isPending = followRecord?.status === "PENDING";

    const canViewProfile = !profileUser.isPrivate || isCurrentUser || isFollowing;

    let tweetsData: any[] = [];

    if (canViewProfile) {
        const baseWith = {
            user: true,
            media: true,
            tags: { with: { travelTag: true } },
            likes: session?.user?.id ? { where: (l: any, { eq }: any) => eq(l.userId, session.user.id), columns: { userId: true } } : undefined,
            retweets: session?.user?.id ? { where: (r: any, { eq }: any) => eq(r.userId, session.user.id), columns: { userId: true } } : undefined,
            bookmarks: session?.user?.id ? { where: (b: any, { eq }: any) => eq(b.userId, session.user.id), columns: { userId: true } } : undefined,
        } as any;

        if (tab === "likes") {
            const likesResult = await db.query.likes.findMany({
                where: (likes, { eq }) => eq(likes.userId, profileUser.id),
                orderBy: (likes, { desc }) => [desc(likes.createdAt)],
                with: {
                    tweet: {
                        with: baseWith
                    }
                }
            });
            tweetsData = likesResult.map(l => (l as any).tweet).filter((t: any) => t && !t.deletedAt);
        } else if (tab === "map") {
            tweetsData = await db.query.tweets.findMany({
                where: (tweets, { and, eq, isNull, isNotNull }) =>
                    and(
                        eq(tweets.userId, profileUser.id),
                        isNull(tweets.deletedAt),
                        isNotNull(tweets.latitude),
                        isNotNull(tweets.longitude)
                    ),
                orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
                with: baseWith
            });
        } else {
            tweetsData = await db.query.tweets.findMany({
                where: (tweets, { and, eq, isNull, or, not, isNotNull }) => {
                    const conds = [eq(tweets.userId, profileUser.id), isNull(tweets.deletedAt)];
                    if (tab === "tweets") {
                        const orClause = or(isNull(tweets.parentId), eq(tweets.isRetweet, true));
                        if (orClause) conds.push(orClause);
                    } else if (tab === "replies") {
                        conds.push(isNotNull(tweets.parentId));
                    }
                    return and(...conds);
                },
                orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
                with: baseWith
            });

            if (tab === "media") {
                tweetsData = tweetsData.filter(t => t.media && t.media.length > 0);
            }
        }
    }

    const formattedTweets = await Promise.all(tweetsData.map(async (tweet: any) => {
        if (!tweet) return null;
        const isRetweet = tweet.isRetweet === true && !!tweet.originalTweetId;
        let displayTweet = tweet;
        if (isRetweet) {
            displayTweet = await db.query.tweets.findFirst({
                where: (tw, { eq }) => eq(tw.id, tweet.originalTweetId as string),
                with: {
                    user: true,
                    media: true,
                    tags: { with: { travelTag: true } },
                    likes: session?.user?.id ? { where: (l: any, { eq }: any) => eq(l.userId, session.user.id), columns: { userId: true } } : undefined,
                    retweets: session?.user?.id ? { where: (r: any, { eq }: any) => eq(r.userId, session.user.id), columns: { userId: true } } : undefined,
                    bookmarks: session?.user?.id ? { where: (b: any, { eq }: any) => eq(b.userId, session.user.id), columns: { userId: true } } : undefined,
                } as any
            });
        }

        if (!displayTweet || displayTweet.deletedAt) return null;
        if (displayTweet.visibility === "PRIVATE" && !isCurrentUser) return null;

        const [counts] = await db.select({
            likes: sql<number>`(SELECT COUNT(*) FROM "Like" WHERE "tweetId" = ${displayTweet.id})`,
            retweets: sql<number>`(SELECT COUNT(*) FROM "Retweet" WHERE "tweetId" = ${displayTweet.id})`,
            replies: sql<number>`(SELECT COUNT(*) FROM "Tweet" WHERE "parentId" = ${displayTweet.id} AND "deletedAt" IS NULL)`,
        }).from(schema.tweets).where(eq(schema.tweets.id, displayTweet.id as string));

        const safeCounts = counts || { likes: 0, retweets: 0, replies: 0 };

        return {
            id: displayTweet.id,
            content: displayTweet.content,
            createdAt: DateTime.fromISO(displayTweet.createdAt).setLocale("ko").toRelative() || "방금 전",
            fullCreatedAt: DateTime.fromISO(displayTweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
            user: {
                id: displayTweet.user.id,
                name: displayTweet.user.name || "알 수 없음",
                username: getUsername(displayTweet.user.email),
                image: displayTweet.user.image || displayTweet.user.avatarUrl,
            },
            media: displayTweet.media?.map((m: any) => ({
                id: m.id,
                url: m.url,
                type: m.type as "IMAGE" | "VIDEO",
                altText: m.altText
            })) || [],
            stats: {
                likes: safeCounts.likes || 0,
                replies: safeCounts.replies || 0,
                retweets: safeCounts.retweets || 0,
                views: "0",
            },
            isLiked: (displayTweet.likes?.length || 0) > 0,
            isRetweeted: (displayTweet.retweets?.length || 0) > 0,
            isBookmarked: (displayTweet.bookmarks?.length || 0) > 0,
            location: displayTweet.locationName ? {
                name: displayTweet.locationName,
                latitude: displayTweet.latitude,
                longitude: displayTweet.longitude,
                address: displayTweet.address,
                city: displayTweet.city,
                country: displayTweet.country,
            } : undefined,
            tags: displayTweet.tags ? displayTweet.tags.map((t: any) => ({
                id: t.travelTag.id,
                name: t.travelTag.name,
                slug: t.travelTag.slug
            })) : [],
            travelPlan: displayTweet.travelPlan ? {
                id: displayTweet.travelPlan.id,
                title: displayTweet.travelPlan.title
            } : undefined,
            retweetedBy: isRetweet ? {
                name: tweet.user.name || "Unknown",
                username: getUsername(tweet.user.email),
                retweetedAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toRelative() ?? undefined,
            } : undefined,
            travelDate: displayTweet.travelDate,
            visibility: displayTweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
        };
    }));

    return data({
        profileUser: profileUserWithCount,
        tweets: formattedTweets.filter(Boolean),
        isCurrentUser,
        isFollowing,
        isPending,
        canViewProfile,
        currentUserId: session?.user?.id,
        tab
    });
};

export default function UserProfile() {
    const loaderData = useLoaderData<typeof loader>();
    if (!loaderData) return null;
    const { profileUser, tweets, isCurrentUser, isFollowing, isPending, canViewProfile, currentUserId, tab } = loaderData;
    const [searchParams, setSearchParams] = useSearchParams();
    const [editOpen, setEditOpen] = useState(false);

    const handleTabChange = (newTab: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", newTab);
        setSearchParams(params);
    };

    const tabs = [
        { id: "tweets", label: "트윗" },
        { id: "replies", label: "답글" },
        { id: "media", label: "미디어" },
        { id: "map", label: "여행 지도" },
        { id: "stats", label: "여행 통계" },
        { id: "likes", label: "마음에 들어요" },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* Banner Area */}
            <div className="h-48 bg-slate-200 dark:bg-slate-800 relative">
                {profileUser.coverImage && (
                    <img src={profileUser.coverImage} alt="Cover" className="h-full w-full object-cover" />
                )}
            </div>

            <div className="p-4 pt-0 relative">
                {/* Profile Header (Avatar + Actions) */}
                <div className="flex justify-between items-start -mt-16 mb-4">
                    <Avatar className="w-32 h-32 border-4 border-background bg-background">
                        <AvatarImage
                            src={profileUser.image || profileUser.avatarUrl || undefined}
                            alt={profileUser.name || "User"}
                            className="object-cover"
                        />
                        <AvatarFallback className="text-4xl">{profileUser.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>

                    <div className="mt-20">
                        {isCurrentUser ? (
                            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(true)}>
                                프로필 수정
                            </Button>
                        ) : (
                            currentUserId && (
                                <FollowButton
                                    targetUserId={profileUser.id}
                                    initialIsFollowing={isFollowing}
                                    initialIsPending={isPending}
                                    size="default"
                                    className="w-24"
                                />
                            )
                        )}
                    </div>
                </div>

                {/* Profile Info */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{profileUser.name}</h1>
                    <p className="text-muted-foreground text-sm">@{getUsername(profileUser.email)}</p>

                    <div className="mt-4 text-base whitespace-pre-wrap leading-relaxed">
                        {profileUser.bio || "소개가 없습니다."}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>가입일: {DateTime.fromISO(profileUser.createdAt).setLocale("ko").toFormat("yyyy년 M월")}</span>
                        </div>
                    </div>

                    {/* Follow Counts - Clickable */}
                    <div className="flex gap-4 mt-4 text-sm">
                        <Link to={`/user/${profileUser.id}/follows?tab=following`} className="hover:underline decoration-foreground/50 cursor-pointer flex items-center">
                            <span className="font-bold text-foreground mr-1">{profileUser._count.following}</span>
                            <span className="text-muted-foreground">팔로잉</span>
                        </Link>
                        <Link to={`/user/${profileUser.id}/follows?tab=followers`} className="hover:underline decoration-foreground/50 cursor-pointer flex items-center">
                            <span className="font-bold text-foreground mr-1">{profileUser._count.followedBy}</span>
                            <span className="text-muted-foreground">팔로워</span>
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border mb-0 sticky top-[60px] bg-background/95 backdrop-blur z-10 transition-all">
                    <div className="flex">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
                                className={cn(
                                    "px-4 py-3 font-medium transition-colors relative hover:bg-accent/50 flex-1 text-center whitespace-nowrap",
                                    tab === t.id
                                        ? "text-foreground font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t.label}
                                {tab === t.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full mx-auto w-10" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* Tweet Feed or Map */}
            <div className="flex-1 pb-20">
                {!canViewProfile ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">🔒</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">비공개 계정입니다</h3>
                        <p className="text-muted-foreground mb-6 text-sm">
                            승인된 팔로워만 @{getUsername(profileUser.email)}님의 트윗과 프로필 정보를 볼 수 있습니다.
                            <br />트윗을 보려면 팔로우 요청을 보내세요.
                        </p>
                    </div>
                ) : tab === "map" ? (
                    <div className="p-4">
                        <TravelMap tweets={tweets} className="h-[600px]" />
                    </div>
                ) : tab === "stats" ? (
                    <TravelStatsTab userId={profileUser.id} />
                ) : tweets.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        {tab === 'tweets' && "아직 작성한 트윗이 없습니다."}
                        {tab === 'replies' && "작성한 답글이 없습니다."}
                        {tab === 'media' && "미디어가 포함된 트윗이 없습니다."}
                        {tab === 'likes' && "마음에 들어한 트윗이 없습니다."}
                    </div>
                ) : (
                    tweets.map((tweet: any) => (
                        <TweetCard
                            key={`${tweet.id}-${tab}`}
                            id={tweet.id}
                            user={tweet.user}
                            content={tweet.content}
                            createdAt={tweet.createdAt}
                            fullCreatedAt={tweet.fullCreatedAt}
                            stats={tweet.stats}
                            isLiked={tweet.isLiked}
                            isRetweeted={tweet.isRetweeted}
                            isBookmarked={tweet.isBookmarked}
                            media={tweet.media}
                            retweetedBy={tweet.retweetedBy}
                            location={tweet.location}
                            tags={tweet.tags}
                            travelDate={tweet.travelDate}
                        />
                    ))
                )}
            </div>

            {/* Profile Edit Dialog */}
            {isCurrentUser && (
                <ProfileEditDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    user={{
                        id: profileUser.id,
                        name: profileUser.name || "Unknown",
                        bio: profileUser.bio,
                        image: profileUser.image || profileUser.avatarUrl,
                        coverImage: profileUser.coverImage || null,
                        isPrivate: !!profileUser.isPrivate,
                    }}
                />
            )}
        </div>
    );
}

// Travel Statistics Tab Component
function TravelStatsTab({ userId }: { userId: string }) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/travel-stats/${userId}`)
            .then(res => res.json())
            .then(data => {
                setStats(data.stats);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load travel stats:", err);
                setLoading(false);
            });
    }, [userId]);

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">여행 통계를 불러오는 중...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                여행 통계를 불러올 수 없습니다.
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalCountries}</div>
                    <div className="text-sm text-muted-foreground mt-1">방문 국가</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalCities}</div>
                    <div className="text-sm text-muted-foreground mt-1">방문 도시</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalTravelDays}</div>
                    <div className="text-sm text-muted-foreground mt-1">여행 일수</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalTravelPosts}</div>
                    <div className="text-sm text-muted-foreground mt-1">여행 게시물</div>
                </div>
            </div>

            {/* Top Countries */}
            {stats.topCountries && stats.topCountries.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-4">가장 많이 방문한 국가</h3>
                    <div className="space-y-3">
                        {stats.topCountries.map((item: any, index: number) => (
                            <div key={item.country} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                                    <span className="font-medium">{item.country}</span>
                                </div>
                                <span className="text-primary font-bold">{item.count}회</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Yearly Stats */}
            {stats.yearlyStats && stats.yearlyStats.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-4">연도별 여행 기록</h3>
                    <div className="space-y-2">
                        {stats.yearlyStats.map((item: any) => (
                            <div key={item.year} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <span className="font-medium">{item.year}년</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (item.count / Math.max(...stats.yearlyStats.map((s: any) => s.count))) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-primary w-12 text-right">{item.count}개</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Countries List */}
            {stats.countries && stats.countries.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-4">방문한 모든 국가 ({stats.countries.length})</h3>
                    <div className="flex flex-wrap gap-2">
                        {stats.countries.map((country: string) => (
                            <span key={country} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                {country}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {stats.totalTravelPosts === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                    아직 여행 기록이 없습니다.
                </div>
            )}
        </div>
    );
}
