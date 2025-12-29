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
            image: tweet.user.image,
        },
        media: tweet.media.map(m => ({
            id: m.id,
            url: m.url,
            type: m.type,
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
        location: tweet.locationName ? {
            name: tweet.locationName,
            latitude: tweet.latitude,
            longitude: tweet.longitude,
            address: tweet.address,
            city: tweet.city,
            country: tweet.country,
            travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined,
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
