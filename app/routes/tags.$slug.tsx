import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { getSession } from "~/lib/auth-utils.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const slug = params.slug;
    const session = await getSession(request);
    const userId = session?.user?.id;

    if (!slug) {
        throw new Response("잘못된 요청입니다.", { status: 400 });
    }

    // 태그 검색 (slug 또는 name으로 검색)
    // slug는 unique가 아닐 수도 있으므로 findFirst 사용 (schema 확인 필요하지만 안전하게)
    // TravelTag schema: slug String @unique
    const tag = await prisma.travelTag.findUnique({
        where: { slug: decodeURIComponent(slug) }
    });

    if (!tag) {
        throw new Response("태그를 찾을 수 없습니다.", { status: 404 });
    }

    // 해당 태그가 포함된 트윗 검색
    const tweets = await prisma.tweet.findMany({
        where: {
            deletedAt: null,
            parentId: null,
            tags: {
                some: {
                    travelTagId: tag.id
                }
            }
        },
        orderBy: { createdAt: "desc" },
        include: {
            user: true,
            media: true,
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
            tags: { include: { travelTag: true } }
        }
    });

    const formattedTweets = tweets.map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
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
            likes: tweet._count.likes,
            replies: tweet._count.replies,
            retweets: tweet._count.retweets,
            views: "0",
        },
        isLiked: tweet.likes && tweet.likes.length > 0,
        isRetweeted: tweet.retweets && tweet.retweets.length > 0,
        isBookmarked: tweet.bookmarks && tweet.bookmarks.length > 0,
        location: tweet.locationName ? {
            name: tweet.locationName,
            latitude: tweet.latitude || undefined,
            longitude: tweet.longitude || undefined,
        } : undefined,
        travelDate: tweet.travelDate?.toISOString(),
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

import { TravelMap } from "~/components/travel/travel-map";
import { useMemo } from "react";

// ... (previous imports)

// ... (loader and meta remain same)

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
