import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, data, redirect, Link } from "react-router";
import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma.server";
import { FollowButton } from "~/components/user/follow-button";
import { TweetCard } from "~/components/tweet/tweet-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return [{ title: "사용자 프로필 / STAYnC" }];
    return [
        { title: `${data.profileUser.name} (@${data.profileUser.email.split("@")[0]}) / STAYnC` },
        { name: "description", content: data.profileUser.bio || "STAYnC 사용자 프로필" },
    ];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });

    // params.userId is expected
    const userId = params.userId;
    if (!userId) throw new Response("User ID Required", { status: 400 });

    const profileUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            _count: {
                select: {
                    followedBy: true,
                    following: true,
                    tweets: true,
                }
            },
            followedBy: {
                where: {
                    followerId: session?.user?.id || "",
                },
                select: {
                    id: true, // If exists, then 'following' is true
                }
            }
        }
    });

    if (!profileUser) {
        throw new Response("User Not Found", { status: 404 });
    }

    // Load User's Tweets
    const tweets = await prisma.tweet.findMany({
        where: { userId: profileUser.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
            user: true,
            likes: { where: { userId: session?.user?.id || "" } },
            retweets: { where: { userId: session?.user?.id || "" } },
            media: true,
            originalTweet: {
                include: {
                    user: true,
                    media: true,
                }
            },
            _count: { select: { likes: true, retweets: true, replies: true } },
        },
    });

    // Transform tweets for UI consistency (TweetCard props)
    const formattedTweets = tweets.map(tweet => ({
        ...tweet,
        isLiked: tweet.likes.length > 0,
        isRetweeted: tweet.retweets.length > 0,
        // Fix type mismatch for retweetedAt if needed
        retweetedBy: tweet.isRetweet && tweet.originalTweet ? {
            username: tweet.user.name || "Unknown",
            userId: tweet.user.id,
            retweetedAt: tweet.createdAt, // The retweet action time
        } : undefined
    }));

    const isCurrentUser = session?.user?.id === profileUser.id;
    const isFollowing = profileUser.followedBy.length > 0;

    return data({
        profileUser,
        tweets: formattedTweets,
        isCurrentUser,
        isFollowing,
        currentUserId: session?.user?.id,
    });
};

export default function UserProfile() {
    const loaderData = useLoaderData<typeof loader>();
    const { profileUser, tweets, isCurrentUser, isFollowing, currentUserId } = loaderData;

    return (
        <div className="flex flex-col min-h-screen">
            {/* Banner Area (Placeholder) */}
            <div className="h-48 bg-slate-200 dark:bg-slate-800 relative">
                {/* Can implement banner image here later */}
            </div>

            <div className="p-4 pt-0 relative">
                {/* Profile Header (Avatar + Actions) */}
                <div className="flex justify-between items-start -mt-16 mb-4">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-black bg-white">
                        <AvatarImage src={profileUser.avatarUrl || profileUser.image || undefined} alt={profileUser.name || "User"} />
                        <AvatarFallback className="text-4xl">{profileUser.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>

                    <div className="mt-20">
                        {isCurrentUser ? (
                            <Button variant="outline" className="rounded-full">
                                프로필 수정
                            </Button>
                        ) : (
                            currentUserId && (
                                <FollowButton
                                    targetUserId={profileUser.id}
                                    initialIsFollowing={isFollowing}
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
                    <p className="text-slate-500 text-sm">@{profileUser.email.split("@")[0]}</p>

                    <div className="mt-4 text-base whitespace-pre-wrap">
                        {profileUser.bio || "소개가 없습니다."}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-slate-500 text-sm">
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>가입일: {DateTime.fromJSDate(new Date(profileUser.createdAt)).toFormat("yyyy년 M월")}</span>
                        </div>
                    </div>

                    {/* Follow Counts - Clickable */}
                    <div className="flex gap-4 mt-4 text-sm">
                        <Link to={`/user/${profileUser.id}/follows?tab=following`} className="hover:underline decoration-foreground/50 cursor-pointer flex items-center">
                            <span className="font-bold text-slate-900 dark:text-white mr-1">{profileUser._count.following}</span>
                            <span className="text-slate-500">팔로잉</span>
                        </Link>
                        <Link to={`/user/${profileUser.id}/follows?tab=followers`} className="hover:underline decoration-foreground/50 cursor-pointer flex items-center">
                            <span className="font-bold text-slate-900 dark:text-white mr-1">{profileUser._count.followedBy}</span>
                            <span className="text-slate-500">팔로워</span>
                        </Link>
                    </div>
                </div>

                {/* Tabs (Tweets, Media, Likes, etc.) - Placeholder */}
                <div className="border-b border-slate-200 dark:border-slate-800 mb-0">
                    <div className="flex">
                        <div className="px-4 py-3 font-semibold border-b-4 border-blue-500 text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            트윗
                        </div>
                        <div className="px-4 py-3 font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            답글
                        </div>
                        <div className="px-4 py-3 font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            미디어
                        </div>
                        <div className="px-4 py-3 font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            마음에 들어요
                        </div>
                    </div>
                </div>

            </div>

            {/* Tweet Feed */}
            <div className="flex-1">
                {tweets.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        작성한 트윗이 없습니다.
                    </div>
                ) : (
                    tweets.map((tweet) => (
                        <TweetCard
                            key={tweet.id}
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
                            media={tweet.media.map((m) => ({ id: m.id, type: m.type as "IMAGE" | "VIDEO", url: m.url }))}
                            retweetedBy={tweet.retweetedBy ? {
                                name: tweet.retweetedBy.username,
                                username: "user",
                                retweetedAt: undefined
                            } : undefined}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
