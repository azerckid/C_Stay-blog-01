import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useLoaderData, useSearchParams, Link, useNavigate, useSubmit, useFetcher } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, ilike, like, desc, lt, gte, lte, sql, inArray, count } from "drizzle-orm";
import { UserCard } from "~/components/user/user-card";
import { TweetCard } from "~/components/tweet/tweet-card";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Button } from "~/components/ui/button";
import { FilterIcon, Calendar03Icon, Location01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { LocationPickerDialog, type LocationData } from "~/components/maps/location-picker-dialog";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

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
    const country = url.searchParams.get("country");
    const city = url.searchParams.get("city");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = 20;

    if (!query) {
        return { session, query, type: type || "tweets", results: [], nextCursor: null };
    }

    // 스마트 탭 감지: 명시적인 type이 없을 경우
    if (!type) {
        const [{ value: userMatchCount }] = await db.select({ value: count() })
            .from(schema.users)
            .where(or(
                ilike(schema.users.name, `%${query}%`),
                ilike(schema.users.email, `${query}%`)
            ));

        // 일치하는 사용자가 있으면 사용자 탭을 기본값으로, 없으면 트윗 탭으로 설정
        type = userMatchCount > 0 ? "users" : "tweets";
    }

    let results: any[] = [];
    let nextCursor: string | null = null;

    if (type === "users") {
        const users = await db.query.users.findMany({
            where: (u, { or, ilike }) => or(
                ilike(u.name, `%${query}%`),
                ilike(u.email, `%${query}%`),
                ilike(u.bio, `%${query}%`)
            ),
            limit: 20,
            with: {
                followedBy: userId ? {
                    where: (f, { eq }) => eq(f.followerId, userId),
                    columns: { id: true }
                } : undefined
            },
            columns: {
                id: true,
                name: true,
                email: true,
                image: true,
                avatarUrl: true,
                bio: true
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
        // 1. 키워드 검색: 태그 우선 매칭 로직 적용
        // 검색어가 기존 태그와 정확히 일치하는지 먼저 확인
        const exactTag = await db.query.travelTags.findFirst({
            where: (t, { eq }) => eq(t.name, query)
        });

        const tweets = await db.query.tweets.findMany({
            where: (t, { and, or, eq, ilike, exists, lt, gte, lte, isNull }) => {
                const conditions = [isNull(t.deletedAt)];

                if (cursor) conditions.push(lt(t.createdAt, cursor));

                if (exactTag) {
                    // 정확한 태그가 있는 경우 태그 필터링을 우선 적용
                    conditions.push(
                        inArray(
                            t.id,
                            db.select({ tweetId: schema.tweetTravelTags.tweetId })
                                .from(schema.tweetTravelTags)
                                .where(eq(schema.tweetTravelTags.travelTagId, exactTag.id))
                        )
                    );
                } else if (query) {
                    const orCondition = or(
                        ilike(t.content, `%${query}%`),
                        inArray(
                            t.id,
                            db.select({ tweetId: schema.tweetTravelTags.tweetId })
                                .from(schema.tweetTravelTags)
                                .leftJoin(schema.travelTags, eq(schema.tweetTravelTags.travelTagId, schema.travelTags.id))
                                .where(ilike(schema.travelTags.name, `%${query}%`))
                        )
                    );
                    if (orCondition) conditions.push(orCondition);
                }

                if (country) conditions.push(eq(t.country, country));
                if (city) conditions.push(eq(t.city, city));
                if (startDate || endDate) {
                    if (startDate) conditions.push(gte(t.travelDate, startDate));
                    if (endDate) conditions.push(lte(t.travelDate, endDate));
                }

                return and(...conditions);
            },
            limit: limit + 1,
            orderBy: (t, { desc }) => [desc(t.createdAt)],
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


        results = tweets.map(tweet => ({
            type: 'tweet',
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
            rawDate: tweet.createdAt, // 정렬용 원본 날짜 유지
            location: tweet.locationName ? {
                name: tweet.locationName,
                latitude: tweet.latitude || undefined,
                longitude: tweet.longitude || undefined,
                address: tweet.address || undefined,
                city: tweet.city || undefined,
                country: tweet.country || undefined,
            } : undefined,
            travelDate: tweet.travelDate,
            tags: tweet.tags.map(t => ({
                id: t.travelTag.id,
                name: t.travelTag.name,
                slug: t.travelTag.slug
            }))
        }));

        // AI 기반 의미 검색 추가 (첫 페이지 로딩 시 혹은 명시적 요청 시)
        if (!cursor && query.length > 1) {
            try {
                const { generateEmbedding } = await import("~/lib/gemini.server");
                const queryVector = await generateEmbedding(query);
                const stringVector = `[${queryVector.join(",")}]`; // Turso vector format

                // Turso 벡터 검색 쿼리 실행
                const semanticMatches: any[] = await db.all(sql`
                    SELECT tweet_id as tweetId, vector_distance_cos(vector, vector32(${stringVector})) as distance 
                    FROM "TweetEmbedding" 
                    WHERE vector_distance_cos(vector, vector32(${stringVector})) < 0.4
                    ORDER BY distance ASC 
                    LIMIT 20
                `);

                if (semanticMatches.length > 0) {
                    const matchIds = semanticMatches.map(m => m.tweetId);
                    const existingIds = new Set(results.map(r => r.id));
                    const newIds = matchIds.filter(id => !existingIds.has(id));

                    if (newIds.length > 0) {
                        const semanticTweets = await db.query.tweets.findMany({
                            where: (t, { inArray, and, isNull }) => and(inArray(t.id, newIds), isNull(t.deletedAt)),
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


                        const formattedSemantic = semanticTweets.map(tweet => ({
                            type: 'tweet',
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
                            rawDate: tweet.createdAt,
                            location: tweet.locationName ? {
                                name: tweet.locationName,
                                latitude: tweet.latitude || undefined,
                                longitude: tweet.longitude || undefined,
                                address: tweet.address || undefined,
                                city: tweet.city || undefined,
                                country: tweet.country || undefined,
                            } : undefined,
                            travelDate: tweet.travelDate,
                            tags: tweet.tags.map(t => ({
                                id: t.travelTag.id,
                                name: t.travelTag.name,
                                slug: t.travelTag.slug
                            }))
                        }));

                        // 기존 결과와 합친 후 최신순으로 재정렬 (사용자 요청 반영)
                        results = [...formattedSemantic, ...results].sort((a, b) =>
                            new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
                        );

                        // 중복 ID 제거
                        const seenIds = new Set();
                        results = results.filter(tweet => {
                            if (seenIds.has(tweet.id)) return false;
                            seenIds.add(tweet.id);
                            return true;
                        });
                    }
                }
            } catch (e) {
                console.error("Semantic Search Error:", e);
            }
        }

        // 페이지네이션 커서 계산 (결과가 limit보다 많을 때만 생성)
        if (results.length > limit) {
            // ... (기존 로직 유지)
            if (tweets.length > limit) {
                nextCursor = tweets[limit - 1].createdAt;
            } else if (results[limit - 1]?.rawDate) {
                nextCursor = results[limit - 1].rawDate;
            }
            results = results.slice(0, limit);
        }
    }


    return {
        session,
        query,
        type,
        results,
        nextCursor,
        filters: { country, city, startDate, endDate }
    };
}

// 에러 처리 및 사용자 경험을 위한 ErrorBoundary 추가
export function ErrorBoundary() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <HugeiconsIcon icon={Search01Icon} className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">검색 중 오류가 발생했습니다</h2>
            <p className="text-muted-foreground mb-6">잠시 후 다시 시도해 주시거나 다른 검색어를 입력해 보세요.</p>
            <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-full"
            >
                <HugeiconsIcon icon={ArrowLeft02Icon} className="mr-2 h-4 w-4" />
                이전 페이지로
            </Button>
        </div>
    );
}


export default function SearchPage() {
    const { session, query, type, results: initialResults, nextCursor: initialNextCursor, filters = {} } = useLoaderData<typeof loader>() as any;
    const navigate = useNavigate();
    const fetcher = useFetcher<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const [results, setResults] = useState(initialResults);
    const [nextCursor, setNextCursor] = useState(initialNextCursor);
    const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isLoadingMore = fetcher.state !== "idle";

    // Handle Tab Change
    const handleTabChange = (newType: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("type", newType);
        setSearchParams(newParams);
    };

    const handleFilterChange = (key: string, value: string | null) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("country");
        newParams.delete("city");
        newParams.delete("startDate");
        newParams.delete("endDate");
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
                setResults((prev: any[]) => [...prev, ...newResults]);
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
                                placeholder="keyword 검색"
                                className="pl-10 rounded-full bg-accent/50 border-transparent focus:bg-background focus:border-primary transition-all"
                                autoComplete="off"
                            />
                            <HugeiconsIcon
                                icon={Search01Icon}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                            />
                        </div>
                    </Form>
                    <Popover>
                        <PopoverTrigger>
                            <Button variant="ghost" size="icon" className={cn("rounded-full", (filters?.country || filters?.startDate) && "text-primary")}>
                                <HugeiconsIcon icon={FilterIcon} className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">검색 필터</h4>
                                    <p className="text-sm text-muted-foreground">여행지나 날짜로 결과를 좁힐 수 있습니다.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">여행지</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-start gap-2 h-9 font-normal"
                                        onClick={() => setIsLocationDialogOpen(true)}
                                    >
                                        <HugeiconsIcon icon={Location01Icon} className="h-4 w-4 text-muted-foreground" />
                                        {filters?.city ? `${filters.country} ${filters.city}` : filters?.country || "도시/국가 선택"}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">시작일</Label>
                                        <Input
                                            type="date"
                                            className="h-9 text-xs"
                                            value={filters?.startDate || ""}
                                            onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">종료일</Label>
                                        <Input
                                            type="date"
                                            className="h-9 text-xs"
                                            value={filters?.endDate || ""}
                                            onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={clearFilters}
                                >
                                    필터 초기화
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <LocationPickerDialog
                    open={isLocationDialogOpen}
                    onOpenChange={setIsLocationDialogOpen}
                    onLocationSelect={(loc: LocationData) => {
                        const newParams = new URLSearchParams(searchParams);
                        if (loc.country) newParams.set("country", loc.country);
                        if (loc.city) newParams.set("city", loc.city);
                        setSearchParams(newParams);
                    }}
                />

                {/* Active Filters Display */}
                {(filters?.country || filters?.startDate || filters?.endDate) && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                        {filters?.country && (
                            <Badge variant="secondary" className="gap-1 pl-1 pr-2 py-0.5 font-normal">
                                <button onClick={() => {
                                    const p = new URLSearchParams(searchParams);
                                    p.delete("country");
                                    p.delete("city");
                                    setSearchParams(p);
                                }} className="p-0.5 hover:bg-background/20 rounded-full">
                                    <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                                </button>
                                {filters.city ? `${filters.country} ${filters.city}` : filters.country}
                            </Badge>
                        )}
                        {(filters?.startDate || filters?.endDate) && (
                            <Badge variant="secondary" className="gap-1 pl-1 pr-2 py-0.5 font-normal">
                                <button onClick={() => {
                                    const p = new URLSearchParams(searchParams);
                                    p.delete("startDate");
                                    p.delete("endDate");
                                    setSearchParams(p);
                                }} className="p-0.5 hover:bg-background/20 rounded-full">
                                    <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                                </button>
                                {filters?.startDate || "~"} ~ {filters?.endDate || ""}
                            </Badge>
                        )}
                    </div>
                )}

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
            </header >

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
        </div >
    );
}
