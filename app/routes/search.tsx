import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useLoaderData, useSearchParams, Link, useNavigate, useSubmit, useFetcher } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { UserCard } from "~/components/user/user-card";
import { TweetCard } from "~/components/tweet/tweet-card";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { generateEmbedding, vectorToBuffer } from "~/lib/gemini.server";




export const meta: MetaFunction = ({ data }: any) => {
    return [{ title: `검색 / STAYnC` }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    const userId = session?.user?.id;
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    let type = url.searchParams.get("type");
    const cursor = url.searchParams.get("cursor"); // Tweet ID or Date
    const limit = 20;

    if (!query) {
        return { session, query, type: type || "tweets", results: [], nextCursor: null };
    }


    // 스마트 탭 감지: 명시적인 type이 없을 경우
    if (!type) {
        const userMatchCount = await prisma.user.count({
            where: {
                OR: [
                    { name: { contains: query } },
                    { email: { startsWith: query } }
                ]
            }
        });
        // 일치하는 사용자가 있으면 사용자 탭을 기본값으로, 없으면 트윗 탭으로 설정
        type = userMatchCount > 0 ? "users" : "tweets";
    }


    let results: any[] = [];
    let nextCursor: string | null = null;


    if (type === "users") {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { email: { contains: query } },
                    { bio: { contains: query } }
                ]
            },
            take: 20,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                avatarUrl: true,
                bio: true,
                followedBy: userId ? {
                    where: { followerId: userId },
                    select: { id: true }
                } : false
            }
        });

        results = users.map(user => ({
            type: 'user',
            id: user.id,
            name: user.name,
            username: user.email.split("@")[0],
            image: user.image,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            isFollowing: (user.followedBy?.length ?? 0) > 0,
            isCurrentUser: user.id === userId
        }));
    } else {
        // Tweets Search
        const tweets = await prisma.tweet.findMany({
            where: {
                deletedAt: null,
                ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
                OR: [
                    { content: { contains: query } },
                    {
                        tags: {
                            some: {
                                travelTag: {
                                    name: { contains: query }
                                }
                            }
                        }
                    }
                ]
            },
            take: limit + 1,
            orderBy: { createdAt: "desc" },

            include: {
                user: true,
                media: true,
                _count: { select: { likes: true, replies: true, retweets: true } },
                likes: userId ? { where: { userId }, select: { userId: true } } : false,
                retweets: userId ? { where: { userId }, select: { userId: true } } : false,
                tags: { include: { travelTag: true } }
            }
        });

        results = tweets.map(tweet => ({
            type: 'tweet',
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
                type: m.type,
                altText: m.altText
            })),
            stats: {
                likes: tweet._count.likes,
                replies: tweet._count.replies,
                retweets: tweet._count.retweets,
                views: "0",
            },
            isLiked: (tweet.likes?.length ?? 0) > 0,
            isRetweeted: (tweet.retweets?.length ?? 0) > 0,
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

        // AI 기반 의미 검색 추가 (첫 페이지 로딩 시 혹은 명시적 요청 시)
        if (!cursor && query.length > 1) {
            try {
                const queryVector = await generateEmbedding(query);
                const vectorBuffer = vectorToBuffer(queryVector);

                // Turso 벡터 검색 쿼리 실행 (단거리 순으로 20개)
                const semanticMatches: any[] = await prisma.$queryRaw`
                    SELECT tweetId, vector_distance_cos(vector, ${vectorBuffer}) as distance 
                    FROM TweetEmbedding 
                    WHERE vector_distance_cos(vector, ${vectorBuffer}) < 0.2
                    ORDER BY distance ASC 
                    LIMIT 20
                `;

                if (semanticMatches.length > 0) {
                    const matchIds = semanticMatches.map(m => m.tweetId);
                    const existingIds = new Set(results.map(r => r.id));
                    const newIds = matchIds.filter(id => !existingIds.has(id));

                    if (newIds.length > 0) {
                        const semanticTweets = await prisma.tweet.findMany({
                            where: { id: { in: newIds }, deletedAt: null },
                            include: {
                                user: true,
                                media: true,
                                _count: { select: { likes: true, replies: true, retweets: true } },
                                likes: userId ? { where: { userId }, select: { userId: true } } : false,
                                retweets: userId ? { where: { userId }, select: { userId: true } } : false,
                                tags: { include: { travelTag: true } }
                            }
                        });

                        const formattedSemantic = semanticTweets.map(tweet => ({
                            type: 'tweet',
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
                                type: m.type,
                                altText: m.altText
                            })),
                            stats: {
                                likes: tweet._count.likes,
                                replies: tweet._count.replies,
                                retweets: tweet._count.retweets,
                                views: "0",
                            },
                            isLiked: (tweet.likes?.length ?? 0) > 0,
                            isRetweeted: (tweet.retweets?.length ?? 0) > 0,
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

                        results = [...formattedSemantic, ...results];
                    }
                }
            } catch (e) {
                console.error("Semantic Search Error:", e);
            }
        }

        nextCursor = results.length > limit ? tweets[limit - 1].createdAt.toISOString() : null;
        if (results.length > limit) results.pop();
    }

    return { session, query, type, results, nextCursor };
}

export default function SearchPage() {
    const { session, query, type, results: initialResults, nextCursor: initialNextCursor } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const fetcher = useFetcher<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const [results, setResults] = useState(initialResults);
    const [nextCursor, setNextCursor] = useState(initialNextCursor);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isLoadingMore = fetcher.state !== "idle";

    // Handle Tab Change
    const handleTabChange = (newType: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("type", newType);
        // Reset results when manually changing tabs (the useEffect below will capture searchParams change)
        setSearchParams(newParams);
    };

    // 무한 스크롤: Intersection Observer로 하단 감지 (트윗 탭에서만 활성화)
    useEffect(() => {
        if (!loadMoreRef.current || !nextCursor || isLoadingMore || type !== 'tweets') return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor) {
                    fetcher.load(`/search?q=${encodeURIComponent(query || "")}&type=${type}&cursor=${encodeURIComponent(nextCursor)}`);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [nextCursor, isLoadingMore, fetcher, type, query]);

    // 추가 트윗 로드 완료 시 상태 업데이트
    useEffect(() => {
        if (fetcher.data && fetcher.state === "idle") {
            const newResults = fetcher.data.results;
            if (newResults && newResults.length > 0) {
                setResults((prev) => [...prev, ...newResults]);
                setNextCursor(fetcher.data.nextCursor);
            } else {
                setNextCursor(null);
            }
        }
    }, [fetcher.data, fetcher.state]);

    // 초기 데이터 변경(새 검색어) 시 상태 초기화
    useEffect(() => {
        setResults(initialResults);
        setNextCursor(initialNextCursor);
    }, [initialResults, initialNextCursor]);


    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="px-4 py-3 flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
                    >
                        <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="h-5 w-5" />
                    </button>
                    <Form className="flex-1 relative" action="/search">
                        <input type="hidden" name="type" value={type} />
                        <div className="relative">
                            <Input
                                name="q"
                                defaultValue={query || ""}
                                placeholder="C-STAY 검색"
                                className="pl-10 rounded-full bg-accent/50 border-transparent focus:bg-background focus:border-primary transition-all"
                                autoComplete="off"
                            />
                            <HugeiconsIcon
                                icon={Search01Icon}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                            />
                        </div>
                    </Form>
                </div>

                {/* Tabs - Only show when there is a query or just always show for navigation? */}
                <div className="px-4">
                    <Tabs value={type} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="w-full grid grid-cols-2 bg-transparent h-12 p-0 border-b-0">
                            <TabsTrigger
                                value="tweets"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none h-full px-0"
                            >
                                인기/최신
                            </TabsTrigger>
                            <TabsTrigger
                                value="users"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none h-full px-0"
                            >
                                사용자
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <main className="flex-1">
                {!query ? (
                    <div className="p-8 text-center text-muted-foreground text-sm mt-10">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                                <HugeiconsIcon icon={Search01Icon} className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2">C-STAY 검색</h3>
                        <p>관심 있는 주제나 사용자를 찾아보세요.</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground mt-10">
                        <p className="text-lg font-bold mb-2">"{query}"에 대한 결과가 없습니다.</p>
                        <p className="text-sm">검색어를 확인하거나 다른 키워드로 시도해보세요.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {type === 'tweets' && results.map((tweet: any) => (
                            <TweetCard
                                key={tweet.id}
                                {...tweet}
                            />
                        ))}
                        {type === 'users' && results.map((user: any) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                isCurrentUser={user.isCurrentUser}
                                isFollowing={user.isFollowing}
                            />
                        ))}

                        {/* 무한 스크롤 트리거 (트윗 검색에서만 작동) */}
                        {type === 'tweets' && nextCursor && (
                            <div ref={loadMoreRef} className="p-4 flex justify-center">
                                {isLoadingMore && <LoadingSpinner size="md" />}
                            </div>
                        )}
                    </div>

                )}
            </main>
        </div>
    );
}
