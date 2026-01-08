import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { db } from "~/db";
import { travelTags, tweets, tweetTravelTags } from "~/db/schema";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { DateTime } from "luxon";
import { getSession } from "~/lib/auth-utils.server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { TravelMap } from "~/components/travel/travel-map";
import { useMemo } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const slug = params.slug;
    const session = await getSession(request);
    const userId = session?.user?.id;

    if (!slug) {
        throw new Response("잘못된 요청입니다.", { status: 400 });
    }

    // 태그 검색 (slug 또는 name으로 검색)
    // TravelTag schema: slug String @unique
    const tag = await db.query.travelTags.findFirst({
        where: eq(travelTags.slug, decodeURIComponent(slug))
    });

    if (!tag) {
        throw new Response("태그를 찾을 수 없습니다.", { status: 404 });
    }

    // 해당 태그가 포함된 트윗 검색
    const foundTweets = await db.query.tweets.findMany({
        where: and(
            isNull(tweets.deletedAt),
            isNull(tweets.parentId),
            inArray(
                tweets.id,
                db.select({ tweetId: tweetTravelTags.tweetId })
                    .from(tweetTravelTags)
                    .where(eq(tweetTravelTags.travelTagId, tag.id))
            )
        ),
        orderBy: [desc(tweets.createdAt)],
        with: {
            user: true,
            media: true,
            likes: { columns: { userId: true } },
            replies: { columns: { id: true } },
            retweets: { columns: { userId: true } },
            bookmarks: userId ? { where: (b, { eq }) => eq(b.userId, userId), columns: { userId: true } } : undefined,
            tags: { with: { travelTag: true } }
        }
    });

    const formattedTweets = foundTweets.map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            id: tweet.user.id,
            name: tweet.user.name || "알 수 없음",
            username: tweet.user.email.split("@")[0],
            image: tweet.user.image || tweet.user.avatarUrl,
        },
        media: tweet.media.map(m => ({
            id: m.id,
            url: m.url,
            type: m.type as "IMAGE" | "VIDEO",
            altText: m.altText
        })),
        stats: {
            likes: tweet.likes.length,
            replies: tweet.replies.length,
            retweets: tweet.retweets.length,
            views: "0",
        },
        isLiked: tweet.likes.some(l => l.userId === userId),
        isRetweeted: tweet.retweets.some(r => r.userId === userId),
        isBookmarked: (tweet.bookmarks?.length ?? 0) > 0,
        location: tweet.locationName ? {
            name: tweet.locationName,
            latitude: tweet.latitude || undefined,
            longitude: tweet.longitude || undefined,
        } : undefined,
        travelDate: tweet.travelDate, // Already string
        tags: tweet.tags.map(t => ({
            id: t.travelTag.id,
            name: t.travelTag.name,
            slug: t.travelTag.slug
        }))
    }));

    return { tag, tweets: formattedTweets };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data?.tag) {
        return [{ title: "태그를 찾을 수 없음 / STAYnC" }];
    }
    return [
        { title: `#${data.tag.name} - 태그 검색 / STAYnC` },
        { name: "description", content: `#${data.tag.name} 태그가 포함된 트윗 모음` },
    ];
};

export default function TagFeed() {
    const { tag, tweets } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    // 지도를 위한 데이터 포맷팅
    const mapItems = useMemo(() => {
        return tweets
            .filter((t: any) => t.location?.latitude && t.location?.longitude)
            .map((t: any) => ({
                id: t.id,
                latitude: t.location.latitude,
                longitude: t.location.longitude,
                createdAt: t.travelDate || t.fullCreatedAt, // 여행 날짜 우선, 없으면 작성일
                locationName: t.location.name,
                content: t.content,
                media: t.media
            }));
    }, [tweets]);

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
                    <h1 className="text-xl font-bold leading-none mb-1">#{tag.name}</h1>
                    <span className="text-xs text-muted-foreground">{tweets.length}개의 트윗</span>
                </div>
            </header>

            {/* Map Section */}
            {mapItems.length > 0 && (
                <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span>🗺️ 여행 경로</span>
                            <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {mapItems.length}개의 장소
                            </span>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            지도에서 여행의 발자취를 확인해보세요.
                        </p>
                    </div>
                    <TravelMap tweets={mapItems} className="h-[400px] shadow-md border-border" />
                </div>
            )}

            {/* Feed */}
            <main className="pb-20">
                {tweets.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        이 태그가 포함된 트윗이 없습니다.
                    </div>
                ) : (
                    tweets.map((tweet: any) => (
                        <TweetCard key={tweet.id} {...tweet} />
                    ))
                )}
            </main>
        </div>
    );
}
