import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useNavigate, redirect, data, useLocation } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { getSession } from "~/lib/auth-utils.server";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { cn } from "~/lib/utils";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const tweetId = params.tweetId;
    const session = await getSession(request);
    const userId = session?.user?.id;

    if (!tweetId) {
        throw new Response("잘못된 요청입니다.", { status: 400 });
    }

    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        include: {
            // ... (keep existing includes, we need to check parentId first)
            user: true,
            _count: {
                select: {
                    likes: true,
                    replies: true,
                    retweets: true,
                }
            },
            likes: userId ? { where: { userId }, select: { userId: true } } : false,
            retweets: userId ? { where: { userId }, select: { userId: true } } : false,
            bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
            media: true,
            tags: { include: { travelTag: true } },
            replies: {
                where: { deletedAt: null },
                orderBy: [
                    { likes: { _count: "desc" } },
                    { createdAt: "desc" }
                ],
                include: {
                    user: true,
                    media: true,
                    _count: { select: { likes: true, replies: true, retweets: true } },
                    likes: userId ? { where: { userId }, select: { userId: true } } : false,
                    retweets: userId ? { where: { userId }, select: { userId: true } } : false,
                    bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
                    tags: { include: { travelTag: true } },
                }
            }
        }
    });

    if (!tweet) {
        throw new Response("트윗을 찾을 수 없습니다.", { status: 404 });
    }

    // Soft Delete Check
    if (tweet.deletedAt) {
        throw new Response("삭제된 트윗입니다.", { status: 404 });
    }

    // [New Logic] If this is a reply, redirect to parent tweet with hash
    if (tweet.parentId) {
        // 부모 트윗 페이지로 리다이렉트 (해당 답글로 스크롤되도록 hash 추가)
        return redirect(`/tweet/${tweet.parentId}#${tweet.id}`);
    }

    // ... (rest of logic)

    const formatTweetData = (t: any) => ({
        id: t.id,
        content: t.content,
        createdAt: DateTime.fromJSDate(t.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromJSDate(t.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            id: t.user.id,
            name: t.user.name || "알 수 없음",
            username: t.user.email.split("@")[0],
            image: t.user.image,
        },
        stats: {
            likes: t._count.likes,
            replies: t._count.replies,
            retweets: t._count.retweets,
            views: "0",
        },
        isLiked: t.likes && t.likes.length > 0,
        isRetweeted: t.retweets && t.retweets.length > 0,
        isBookmarked: t.bookmarks && t.bookmarks.length > 0,
        location: t.locationName ? {
            name: t.locationName,
            latitude: t.latitude,
            longitude: t.longitude,
            address: t.address,
            city: t.city,
            country: t.country,
        } : undefined,
        travelDate: t.travelDate ? new Date(t.travelDate).toISOString() : null,
        media: t.media ? t.media.map((m: any) => ({
            id: m.id,
            url: m.url,
            type: m.type as "IMAGE" | "VIDEO",
            altText: m.altText
        })) : [],
        tags: t.tags ? t.tags.map((tt: any) => ({
            id: tt.travelTag.id,
            name: tt.travelTag.name,
            slug: tt.travelTag.slug
        })) : []
    });

    const formattedTweet = formatTweetData(tweet);
    const formattedReplies = tweet.replies.map(formatTweetData);

    return data({ tweet: formattedTweet, replies: formattedReplies });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data?.tweet) {
        return [{ title: "트윗을 찾을 수 없음 / STAYnC" }];
    }
    return [
        { title: `${data.tweet.user.name}님의 트윗 / STAYnC` },
        { name: "description", content: data.tweet.content.slice(0, 100) },
    ];
};

export default function TweetDetail() {
    const { tweet, replies } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const location = useLocation();
    const [highlightId, setHighlightId] = useState<string | null>(null);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace("#", "");
            setHighlightId(id);
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
            }
        }
    }, [location.hash, replies]);

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
                <h1 className="text-xl font-bold">트윗</h1>
            </header>

            {/* Tweet Detail */}
            <main className="pb-20">
                <TweetCard {...tweet} />

                {/* Google Map Display */}
                {tweet.location?.latitude && (
                    <div className="w-full h-64 border-y border-border">
                        <Map
                            key={`${tweet.location.latitude}-${tweet.location.longitude}`}
                            defaultCenter={{ lat: tweet.location.latitude, lng: tweet.location.longitude }}
                            defaultZoom={15}
                            mapId="DEMO_MAP_ID"
                            className="w-full h-full"
                            disableDefaultUI={true}
                        >
                            <AdvancedMarker position={{ lat: tweet.location.latitude, lng: tweet.location.longitude }} />
                        </Map>
                    </div>
                )}

                {/* Reply Form */}
                <div className="border-b border-border">
                    <TweetCompose parentId={tweet.id} placeholder="답글을 남겨보세요..." />
                </div>

                {/* Reply List */}
                <div className="flex flex-col">
                    {replies.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            아직 답글이 없습니다.
                        </div>
                    ) : (
                        replies.map((reply: any) => (
                            <div
                                key={reply.id}
                                id={reply.id}
                                className={cn(
                                    "transition-colors duration-1000",
                                    highlightId === reply.id ? "bg-primary/10" : ""
                                )}
                            >
                                <TweetCard {...reply} />
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
