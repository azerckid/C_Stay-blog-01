import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData, data } from "react-router";
import { TweetCard } from "~/components/tweet/tweet-card";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";

export const meta: MetaFunction = () => {
    return [
        { title: "북마크 / STAYnC" },
        { name: "description", content: "STAYnC 북마크 목록" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        // Redirect or throw in a real app, but for now we follow the project pattern
        return data({ tweets: [] }, { status: 401 });
    }

    const userId = session.user.id;

    const bookmarks = await prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            tweet: {
                include: {
                    user: true,
                    media: true,
                    _count: { select: { likes: true, replies: true, retweets: true } },
                    likes: { where: { userId }, select: { userId: true } },
                    retweets: { where: { userId }, select: { userId: true } },
                    bookmarks: { where: { userId }, select: { userId: true } },
                    tags: { include: { travelTag: true } }
                }
            }
        }
    });

    const tweets = bookmarks.map(b => b.tweet).filter(t => !t.deletedAt);

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
        })),
    }));

    return data({ tweets: formattedTweets });
}

export default function BookmarksPage() {
    const { tweets } = useLoaderData<typeof loader>();
    const { data: session } = useSession();

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
                <p className="text-muted-foreground">북마크를 확인하려면 로그인해 주세요.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
                <h1 className="text-xl font-bold font-heading">북마크</h1>
            </header>

            <main className="flex-1">
                {tweets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <h2 className="text-2xl font-bold mb-2">북마크가 비어 있습니다</h2>
                        <p className="text-muted-foreground max-w-xs">
                            나중에 다시 보고 싶은 트윗을 북마크에 추가해 보세요. 북마크에 추가하면 여기에서 확인할 수 있습니다.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {tweets.map((tweet) => (
                            <TweetCard key={tweet.id} {...tweet} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
