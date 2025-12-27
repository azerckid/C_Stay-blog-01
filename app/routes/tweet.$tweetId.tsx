import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";

export async function loader({ params }: LoaderFunctionArgs) {
    const tweetId = params.tweetId;

    if (!tweetId) {
        throw new Response("잘못된 요청입니다.", { status: 400 });
    }

    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        include: {
            user: true,
            _count: {
                select: {
                    likes: true,
                    replies: true,
                    retweets: true,
                }
            }
        }
    });

    if (!tweet) {
        throw new Response("트윗을 찾을 수 없습니다.", { status: 404 });
    }

    const formattedTweet = {
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            name: tweet.user.name || "알 수 없음",
            username: tweet.user.email.split("@")[0],
            image: tweet.user.image,
        },
        stats: {
            likes: tweet._count.likes,
            replies: tweet._count.replies,
            retweets: tweet._count.retweets,
            views: "0",
        },
        location: tweet.locationName ? {
            name: tweet.locationName,
            city: tweet.city,
            country: tweet.country,
            travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined
    };

    return { tweet: formattedTweet };
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
    const { tweet } = useLoaderData<typeof loader>();
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
                <h1 className="text-xl font-bold">트윗</h1>
            </header>

            {/* Tweet Detail */}
            <main>
                <TweetCard {...tweet} />

                {/* Placeholder for Comments */}
                <div className="p-8 text-center text-muted-foreground border-t border-border">
                    <p>댓글 기능은 곧 추가될 예정입니다. (Phase 7)</p>
                </div>
            </main>
        </div>
    );
}
