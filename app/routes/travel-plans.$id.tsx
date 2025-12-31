import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { useLoaderData, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Airplane01Icon, Calendar03Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { TweetCard } from "~/components/tweet/tweet-card";
import { DateTime } from "luxon";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { id: planId } = params;
    const session = await getSession(request);
    const userId = session?.user?.id;

    if (!planId) {
        return data({ error: "잘못된 접근입니다." }, { status: 400 });
    }

    const plan = await prisma.travelPlan.findUnique({
        where: { id: planId },
        include: {
            tweets: {
                where: { deletedAt: null },
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
                    likes: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    retweets: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    bookmarks: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    tags: {
                        include: {
                            travelTag: true
                        }
                    },
                    travelPlan: true
                }
            }
        }
    });

    if (!plan) {
        return data({ error: "여행 계획을 찾을 수 없습니다." }, { status: 404 });
    }

    const formattedTweets = plan.tweets.map((tweet: any) => ({
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
        media: tweet.media.map((m: any) => ({
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
            latitude: tweet.latitude,
            longitude: tweet.longitude,
            address: tweet.address,
            city: tweet.city,
            country: tweet.country,
            travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined,
        tags: tweet.tags.map((t: any) => ({
            id: t.travelTag.id,
            name: t.travelTag.name,
            slug: t.travelTag.slug
        })),
        travelPlan: tweet.travelPlan ? {
            id: tweet.travelPlan.id,
            title: tweet.travelPlan.title,
        } : undefined,
        travelDate: tweet.travelDate ? new Date(tweet.travelDate).toISOString() : null
    }));

    return { plan, tweets: formattedTweets };
}

export default function TravelPlanDetailPage() {
    const { plan, tweets, error } = useLoaderData<typeof loader>() as any;
    const navigate = useNavigate();

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold">{plan.title}</h1>
                    <p className="text-xs text-muted-foreground">{tweets.length}개의 게시물</p>
                </div>
            </header>

            <div className="p-5 border-b border-border bg-accent/5">
                {plan.description && (
                    <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{plan.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                    {plan.startDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4" />
                            <span>
                                {DateTime.fromJSDate(new Date(plan.startDate)).setLocale("ko").toFormat("yyyy년 MM월 dd일")}
                                {plan.endDate && ` ~ ${DateTime.fromJSDate(new Date(plan.endDate)).setLocale("ko").toFormat("MM월 dd일")}`}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-primary">
                        <HugeiconsIcon icon={Airplane01Icon} className="h-4 w-4" />
                        <span>{plan.status === "PLANNING" ? "여행 준비 중" : plan.status === "ONGOING" ? "현재 여행 중" : "추억 여행 완료"}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1">
                {tweets.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">이 여행 계획에 연결된 트윗이 없습니다.</p>
                        <p className="text-sm text-muted-foreground mt-1">트윗 작성 시 이 여행 계획을 선택해보세요!</p>
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
