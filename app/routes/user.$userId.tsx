import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, data, Link, useSearchParams } from "react-router";
import { useState } from "react";
import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma.server";
import { FollowButton } from "~/components/user/follow-button";
import { TweetCard } from "~/components/tweet/tweet-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { cn } from "~/lib/utils";
import { ProfileEditDialog } from "~/components/user/profile-edit-dialog";
import { TravelMap } from "~/components/travel/travel-map";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return [{ title: "사용자 프로필 / STAYnC" }];
    return [
        { title: `${data.profileUser.name} (@${data.profileUser.email.split("@")[0]}) / STAYnC` },
        { name: "description", content: data.profileUser.bio || "STAYnC 사용자 프로필" },
    ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "tweets";

    const userId = params.userId;
    if (!userId) throw new Response("User ID Required", { status: 400 });

    const profileUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            _count: {
                select: {
                    followedBy: { where: { status: "ACCEPTED" } }, // 승인된 팔로워 수만 카운트
                    following: { where: { status: "ACCEPTED" } }, // 승인된 팔로잉 수만 카운트
                    tweets: true,
                }
            },
            followedBy: {
                where: {
                    followerId: session?.user?.id || "",
                },
                select: {
                    id: true,
                    status: true, // 팔로우 상태 확인 (ACCEPTED | PENDING)
                }
            }
        }
    });

    if (!profileUser) {
        throw new Response("User Not Found", { status: 404 });
    }

    const isCurrentUser = session?.user?.id === profileUser.id;
    // Follow relationship check
    const followRecord = profileUser.followedBy[0];
    const isFollowing = followRecord?.status === "ACCEPTED";
    const isPending = followRecord?.status === "PENDING";

    // Access Control Logic
    // Private account logic: Visible if (Not Private) OR (Is Current User) OR (Is Following)
    const canViewProfile = !(profileUser as any).isPrivate || isCurrentUser || isFollowing;

    let tweets: any[] = [];

    if (canViewProfile) {
        const tweetInclude = {
            user: true,
            likes: { where: { userId: session?.user?.id || "" } },
            retweets: { where: { userId: session?.user?.id || "" } },
            bookmarks: { where: { userId: session?.user?.id || "" } },
            media: true,
            tags: { include: { travelTag: true } },
            _count: { select: { likes: true, retweets: true, replies: true } },
        };

        const commonInclude = {
            ...tweetInclude,
            originalTweet: {
                include: tweetInclude
            },
        };

        if (tab === "likes") {
            const likes = await prisma.like.findMany({
                where: { userId: profileUser.id },
                orderBy: { createdAt: "desc" },
                include: {
                    tweet: {
                        include: commonInclude
                    }
                }
            });
            tweets = likes.map(l => l.tweet).filter(t => !t.deletedAt);
        } else if (tab === "map") {
            // 지도 탭의 경우 위치 정보가 있는 모든 트윗을 가져옴
            tweets = await prisma.tweet.findMany({
                where: {
                    userId: profileUser.id,
                    deletedAt: null,
                    latitude: { not: null },
                    longitude: { not: null },
                    // Tweet visibility check handled by application logic or query filter?
                    // For now, assuming if you can view profile, you can view tweets unless tweet itself is PRIVATE/FOLLOWERS constrained differently?
                    // But simplified: Profile access grants tweet access for now, OR need to allow tweet.visibility check.
                    // Let's rely on basic profile privacy for this step.
                },
                orderBy: { createdAt: "desc" },
                include: commonInclude,
            });
        } else {
            const where: any = { userId: profileUser.id, deletedAt: null };

            if (tab === "tweets") {
                where.OR = [
                    { parentId: null },
                    { originalTweetId: { not: null } }
                ];
            } else if (tab === "replies") {
                where.parentId = { not: null };
            } else if (tab === "media") {
                where.media = { some: {} };
            }

            tweets = await prisma.tweet.findMany({
                where,
                orderBy: { createdAt: "desc" },
                include: commonInclude,
            });
        }
    }

    const formattedTweets = tweets.map((tweet: any) => {
        const isRetweet = !!tweet.originalTweetId && !!tweet.originalTweet;
        const displayTweet = isRetweet ? tweet.originalTweet : tweet;

        // Tweet Visibility Logic (Post-fetch filter or simple data passing)
        // If tweet is visibility="PRIVATE", only author can see (handled by query usually, but double check)
        // If visibility="FOLLOWERS", only followers can see (handled by canViewProfile mostly)
        // For simplicity, we just pass data. UI can hide if needed, but critical data protection should be here.
        // Assuming 'canViewProfile' covers most cases. 
        // Direct 'PRIVATE' tweets should be filtered if not current user.
        if (displayTweet.visibility === "PRIVATE" && !isCurrentUser) return null;

        return {
            id: displayTweet.id,
            content: displayTweet.content,
            createdAt: DateTime.fromJSDate(displayTweet.createdAt).setLocale("ko").toRelative() || "방금 전",
            fullCreatedAt: DateTime.fromJSDate(displayTweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
            user: {
                id: displayTweet.user.id,
                name: displayTweet.user.name || "알 수 없음",
                username: displayTweet.user.email.split("@")[0],
                image: displayTweet.user.image || displayTweet.user.avatarUrl,
            },
            media: displayTweet.media.map((m: any) => ({
                id: m.id,
                url: m.url,
                type: m.type as "IMAGE" | "VIDEO",
                altText: m.altText
            })),
            stats: {
                likes: displayTweet._count?.likes || 0,
                replies: displayTweet._count?.replies || 0,
                retweets: displayTweet._count?.retweets || 0,
                views: "0",
            },
            isLiked: displayTweet.likes && displayTweet.likes.length > 0,
            isRetweeted: displayTweet.retweets && displayTweet.retweets.length > 0,
            isBookmarked: displayTweet.bookmarks && displayTweet.bookmarks.length > 0,
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
                username: tweet.user.email.split("@")[0],
                retweetedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() ?? undefined,
            } : undefined,
            travelDate: displayTweet.travelDate ? new Date(displayTweet.travelDate).toISOString() : null,
            visibility: displayTweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
        };
    }).filter(Boolean);

    return data({
        profileUser,
        tweets: formattedTweets,
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
    const { profileUser, tweets, isCurrentUser, isFollowing, isPending, canViewProfile, currentUserId, tab } = loaderData;
    const [searchParams, setSearchParams] = useSearchParams();
    const [editOpen, setEditOpen] = useState(false);

    const handleTabChange = (newTab: string) => {
        setSearchParams(prev => {
            prev.set("tab", newTab);
            return prev;
        });
    };

    const tabs = [
        { id: "tweets", label: "트윗" },
        { id: "replies", label: "답글" },
        { id: "media", label: "미디어" },
        { id: "map", label: "여행 지도" },
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
                    <p className="text-muted-foreground text-sm">@{profileUser.email.split("@")[0]}</p>

                    <div className="mt-4 text-base whitespace-pre-wrap leading-relaxed">
                        {profileUser.bio || "소개가 없습니다."}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>가입일: {DateTime.fromJSDate(new Date(profileUser.createdAt)).setLocale("ko").toFormat("yyyy년 M월")}</span>
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
                                    "px-4 py-3 font-medium transition-colors relative hover:bg-accent/50 flex-1 text-center",
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
                            승인된 팔로워만 @{profileUser.email.split("@")[0]}님의 트윗과 프로필 정보를 볼 수 있습니다.
                            <br />트윗을 보려면 팔로우 요청을 보내세요.
                        </p>
                    </div>
                ) : tab === "map" ? (
                    <div className="p-4">
                        <TravelMap tweets={tweets} className="h-[600px]" />
                    </div>
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
                            user={{
                                id: tweet.user.id,
                                name: tweet.user.name || "Unknown",
                                username: tweet.user.email.split("@")[0],
                                image: tweet.user.image || tweet.user.avatarUrl
                            }}
                            content={tweet.content}
                            createdAt={DateTime.fromJSDate(new Date(tweet.createdAt)).setLocale("ko").toRelative() || ""}
                            fullCreatedAt={DateTime.fromJSDate(new Date(tweet.createdAt)).setLocale("ko").toLocaleString(DateTime.DATETIME_MED)}
                            stats={{
                                replies: tweet._count.replies,
                                retweets: tweet._count.retweets,
                                likes: tweet._count.likes,
                                views: "0"
                            }}
                            isLiked={tweet.isLiked}
                            isRetweeted={tweet.isRetweeted}
                            isBookmarked={tweet.isBookmarked}
                            media={tweet.media ? tweet.media.map((m: any) => ({
                                id: m.id,
                                type: m.type as "IMAGE" | "VIDEO",
                                url: m.url
                            })) : []}
                            retweetedBy={tweet.retweetedBy}
                            location={tweet.locationName ? {
                                name: tweet.locationName,
                                latitude: tweet.latitude,
                                longitude: tweet.longitude,
                            } : undefined}
                            tags={tweet.tags ? tweet.tags.map((t: any) => ({
                                id: t.travelTag.id,
                                name: t.travelTag.name,
                                slug: t.travelTag.slug
                            })) : []}
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
                        name: profileUser.name,
                        bio: profileUser.bio,
                        image: profileUser.image || profileUser.avatarUrl,
                        coverImage: profileUser.coverImage || null,
                        isPrivate: profileUser.isPrivate,
                    }}
                />
            )}
        </div>
    );
}
