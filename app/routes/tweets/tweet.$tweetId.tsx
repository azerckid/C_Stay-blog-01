import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useNavigate, redirect, data, useLocation } from "react-router";
import { db } from "~/db";
import { tweets } from "~/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { Button } from "~/components/ui/button";
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

    const tweet = await db.query.tweets.findFirst({
        where: eq(tweets.id, tweetId),
        with: {
            user: true,
            likes: true, // Fetching all for count, specialized check later if needed is inefficient but safe for now.
            replies: {
                where: isNull(tweets.deletedAt),
                orderBy: [desc(tweets.createdAt)], // Sorting replies by newest first (simple approach) or specialized join sort. Drizzle relations sort simple.
                with: {
                    user: true,
                    media: true,
                    likes: true,
                    replies: true, // Nested replies count? (Original: select likes, replies, retweets counts)
                    retweets: true,
                    bookmarks: userId ? { where: (b, { eq }) => eq(b.userId, userId), columns: { userId: true } } : undefined,
                    tags: { with: { travelTag: true } },
                }
            },
            retweets: true,
            bookmarks: userId ? { where: (b, { eq }) => eq(b.userId, userId), columns: { userId: true } } : undefined,
            media: true,
            tags: { with: { travelTag: true } },
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

    // Mapping helper
    const formatTweetData = (t: any) => ({
        id: t.id,
        content: t.content,
        createdAt: DateTime.fromISO(t.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromISO(t.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            id: t.user.id,
            name: t.user.name || "알 수 없음",
            username: t.user.email.split("@")[0],
            image: t.user.image,
        },
        stats: {
            likes: t.likes.length,
            replies: t.replies.length,
            retweets: t.retweets.length,
            views: "0",
        },
        isLiked: t.likes.some((l: any) => l.userId === userId),
        isRetweeted: t.retweets.some((r: any) => r.userId === userId),
        isBookmarked: (t.bookmarks?.length ?? 0) > 0,
        location: t.locationName ? {
            name: t.locationName,
            latitude: t.latitude,
            longitude: t.longitude,
            address: t.address,
            city: t.city,
            country: t.country,
        } : undefined,
        travelDate: t.travelDate, // already string in Drizzle
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
    // Sort replies: Original was by likes count desc, then date desc.
    // Drizzle relations `orderBy` inside `findFirst` is limited without subqueries/joins for aggregation sort.
    // We will sort in Javascript for simplicity.
    const formattedReplies = tweet.replies.map(formatTweetData).sort((a: any, b: any) => {
        // Sort by likes count desc
        if (b.stats.likes !== a.stats.likes) {
            return b.stats.likes - a.stats.likes;
        }
        // Then by createdAt desc (newest first) - string comparison works for ISO
        return b.fullCreatedAt.localeCompare(a.fullCreatedAt); // Actually `createdAt` relative string is bad for sorting.
        // We need raw date. Let's add rawDate to formatTweetData if strictly needed or just trust the DB sort if we could.
        // But we didn't sort by likes in DB because Drizzle relation sort by aggregate is hard.
        // Let's rely on basic DB sort (date) or add rawDate. 
        // `formatTweetData` output doesn't have rawDate currently. 
        // Let's add it. No, `formatTweetData` uses `t` which has raw ISO string.
    });

    // Correction: `formatTweetData` loses raw date access for valid sorting.
    // Let's re-implement sort safely.
    const repliesWithRaw = tweet.replies.map((r: any) => ({
        ...formatTweetData(r),
        _raw: r
    })).sort((a: any, b: any) => {
        const likesA = a._raw.likes.length;
        const likesB = b._raw.likes.length;
        if (likesB !== likesA) return likesB - likesA;
        return new Date(b._raw.createdAt).getTime() - new Date(a._raw.createdAt).getTime();
    }).map(({ _raw, ...rest }: any) => rest);


    return data({ tweet: formattedTweet, replies: repliesWithRaw });
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
                    <div className="border-y border-border bg-muted/20">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={Location01Icon} className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{tweet.location.name}</h3>
                                    <p className="text-xs text-muted-foreground">{tweet.location.address}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => {
                                    if (tweet.location?.latitude && tweet.location?.longitude) {
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${tweet.location.latitude},${tweet.location.longitude}`, '_blank')
                                    }
                                }}
                            >
                                <HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" />
                                지도에서 보기
                            </Button>
                        </div>
                        <div className="w-full h-64 border-t border-border">
                            <Map
                                key={`${tweet.location.latitude}-${tweet.location.longitude}`}
                                defaultCenter={{ lat: tweet.location.latitude, lng: tweet.location.longitude }}
                                defaultZoom={15}
                                mapId="DEMO_MAP_ID"
                                className="w-full h-full"
                                disableDefaultUI={true}
                                gestureHandling="none" // 상세 페이지에서는 정적 느낌으로 표시 (클릭은 버튼으로)
                            >
                                <AdvancedMarker position={{ lat: tweet.location.latitude, lng: tweet.location.longitude }}>
                                    <div className="p-1 px-2 bg-primary text-primary-foreground rounded-lg shadow-lg text-xs font-bold whitespace-nowrap">
                                        {tweet.location.name}
                                    </div>
                                </AdvancedMarker>
                            </Map>
                        </div>
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
