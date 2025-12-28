import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { getSession } from "~/lib/auth-utils.server";

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
            replies: {
                where: { deletedAt: null },
                orderBy: { createdAt: "asc" }, // 답글은 오래된 순? 최신 순? 보통 최신순 or 인기순. 여기선 오래된 순이 대화 흐름 보기 좋을수도? 일단 asc.
                include: {
                    user: true,
                    _count: { select: { likes: true, replies: true, retweets: true } },
                    likes: userId ? { where: { userId }, select: { userId: true } } : false,
                    retweets: userId ? { where: { userId }, select: { userId: true } } : false,
                }
            }
        }
    });

    if (!tweet) {
        throw new Response("트윗을 찾을 수 없습니다.", { status: 404 });
    }

    // Soft Delete: 삭제된 트윗은 접근 불가
    if (tweet.deletedAt) {
        throw new Response("삭제된 트윗입니다.", { status: 404 });
    }

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
        location: t.locationName ? {
            name: t.locationName,
            city: t.city,
            country: t.country,
            travelDate: t.travelDate ? new Date(t.travelDate).toLocaleDateString() : undefined,
        } : undefined
    });

    const formattedTweet = formatTweetData(tweet);
    const formattedReplies = tweet.replies.map(formatTweetData);

    return { tweet: formattedTweet, replies: formattedReplies };
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
                            <TweetCard key={reply.id} {...reply} />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
