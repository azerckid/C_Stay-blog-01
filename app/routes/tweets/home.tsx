import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData, useFetcher, useSearchParams, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Search01Icon, Location01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { TweetCard } from "~/components/tweet/tweet-card";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

import { db } from "~/db";
import * as schema from "~/db/schema";
import { eq, and, or, isNull, inArray, like, desc, lt, sql } from "drizzle-orm";
import { DateTime } from "luxon";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session?.user?.id;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor"); // ISO String
  const feedType = url.searchParams.get("type") || "for-you"; // 'for-you' | 'following'
  const locationFilter = url.searchParams.get("location"); // country or city name
  const limit = 20;

  let followingIds: string[] = [];

  // 팔로잉 ID 목록 조회
  if (userId) {
    const follows = await db.query.follows.findMany({
      where: (follows, { eq, and }) => and(eq(follows.followerId, userId), eq(follows.status, "ACCEPTED")),
      columns: { followingId: true }
    });
    followingIds = follows.map(f => f.followingId);
  }

  // 공개 범위 필터 생성
  const getVisibilityFilter = (tweetTable: any) => {
    if (userId) {
      return or(
        eq(tweetTable.visibility, "PUBLIC"),
        and(eq(tweetTable.visibility, "FOLLOWERS"), inArray(tweetTable.userId, [...followingIds, userId].length > 0 ? [...followingIds, userId] : ["__none__"])),
        and(eq(tweetTable.visibility, "PRIVATE"), eq(tweetTable.userId, userId))
      );
    }
    return eq(tweetTable.visibility, "PUBLIC");
  };

  // 1. 일반 트윗 조회
  const tweetsPromise = db.query.tweets.findMany({
    where: (tweets, { and, isNull, lt, or, like }) => {
      const conditions = [
        isNull(tweets.deletedAt),
        isNull(tweets.parentId),
        getVisibilityFilter(tweets)
      ];
      if (cursor) conditions.push(lt(tweets.createdAt, cursor));
      if (locationFilter) {
        conditions.push(or(
          like(tweets.country, `%${locationFilter}%`),
          like(tweets.city, `%${locationFilter}%`)
        ));
      }
      if (feedType === "following" && userId) {
        conditions.push(inArray(tweets.userId, [...followingIds, userId].length > 0 ? [...followingIds, userId] : ["__none__"]));
      }
      return and(...conditions);
    },
    limit: limit + 1,
    orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
    with: {
      user: true,
      media: true,
      likes: userId ? { where: (likes, { eq }) => eq(likes.userId, userId), columns: { userId: true } } : undefined,
      retweets: userId ? { where: (retweets, { eq }) => eq(retweets.userId, userId), columns: { userId: true } } : undefined,
      bookmarks: userId ? { where: (bookmarks, { eq }) => eq(bookmarks.userId, userId), columns: { userId: true } } : undefined,
      tags: { with: { travelTag: true } }
    }
  });

  // 2. 리트윗 조회
  const retweetsPromise = db.query.retweets.findMany({
    where: (retweets, { and, lt }) => {
      const conditions = [];
      if (cursor) conditions.push(lt(retweets.createdAt, cursor));
      if (feedType === "following" && userId) {
        conditions.push(inArray(retweets.userId, followingIds.length > 0 ? followingIds : ["__none__"]));
      }
      return and(...conditions);
    },
    limit: limit + 1,
    orderBy: (retweets, { desc }) => [desc(retweets.createdAt)],
    with: {
      user: true,
      tweet: {
        with: {
          user: true,
          media: true,
          likes: userId ? { where: (likes, { eq }) => eq(likes.userId, userId), columns: { userId: true } } : undefined,
          retweets: userId ? { where: (retweets, { eq }) => eq(retweets.userId, userId), columns: { userId: true } } : undefined,
          bookmarks: userId ? { where: (bookmarks, { eq }) => eq(bookmarks.userId, userId), columns: { userId: true } } : undefined,
          tags: { with: { travelTag: true } }
        }
      }
    }
  });

  const [tweetsRaw, retweetsRaw] = await Promise.all([tweetsPromise, retweetsPromise]);

  // 필터링: 리트윗 대상 트윗이 삭제되었거나 공개 범위에 안 맞으면 거름
  const validRetweetsRaw = retweetsRaw.filter(r => {
    if (!r.tweet || r.tweet.deletedAt) return false;
    // 공개 범위 체크 (리트윗 원본 트윗에 대해)
    // Drizzle query API로 미리 필터링하는 게 좋지만, nested where가 복잡하므로 여기서 추가 체크
    if (userId) {
      if (r.tweet.visibility === "PRIVATE" && r.tweet.userId !== userId) return false;
      if (r.tweet.visibility === "FOLLOWERS" && !followingIds.includes(r.tweet.userId) && r.tweet.userId !== userId) return false;
    } else {
      if (r.tweet.visibility !== "PUBLIC") return false;
    }
    return true;
  });

  // 3. 병합 및 정렬
  const combinedFeed = [
    ...tweetsRaw.map(t => ({ type: "tweet", data: t, sortKey: t.createdAt })),
    ...validRetweetsRaw.map(r => ({ type: "retweet", data: r, sortKey: r.createdAt }))
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  // 4. 페이지네이션
  const hasNextPage = combinedFeed.length > limit;
  const paginatedFeed = hasNextPage ? combinedFeed.slice(0, limit) : combinedFeed;
  const nextCursor = paginatedFeed.length > 0 ? paginatedFeed[paginatedFeed.length - 1].sortKey : null;

  // 5. 포맷팅
  const formattedTweets = await Promise.all(paginatedFeed.map(async (item) => {
    if (item.type === "tweet") {
      const tweet = item.data as any;

      // Get counts (As discussed earlier, subqueries or separate counts)
      const [stats] = await db.select({
        likes: sql<number>`(SELECT COUNT(*) FROM "Like" WHERE "tweetId" = ${tweet.id})`,
        retweets: sql<number>`(SELECT COUNT(*) FROM "Retweet" WHERE "tweetId" = ${tweet.id})`,
        replies: sql<number>`(SELECT COUNT(*) FROM "Tweet" WHERE "parentId" = ${tweet.id} AND "deletedAt" IS NULL)`,
      }).from(schema.tweets).where(eq(schema.tweets.id, tweet.id));

      return {
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
        media: tweet.media.map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type as "IMAGE" | "VIDEO",
          altText: m.altText
        })),
        stats: {
          likes: stats.likes || 0,
          replies: stats.replies || 0,
          retweets: stats.retweets || 0,
          views: "0",
        },
        isLiked: (tweet.likes?.length || 0) > 0,
        isRetweeted: (tweet.retweets?.length || 0) > 0,
        isBookmarked: (tweet.bookmarks?.length || 0) > 0,
        location: tweet.locationName ? {
          name: tweet.locationName,
          latitude: tweet.latitude || undefined,
          longitude: tweet.longitude || undefined,
          address: tweet.address || undefined,
          city: tweet.city || undefined,
          country: tweet.country || undefined,
        } : undefined,
        travelDate: tweet.travelDate,
        tags: tweet.tags.map((t: any) => ({
          id: t.travelTag.id,
          name: t.travelTag.name,
          slug: t.travelTag.slug
        })),
        retweetedBy: undefined,
        visibility: tweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
      };
    } else {
      const retweetData = item.data as any;
      const tweet = retweetData.tweet;

      const [stats] = await db.select({
        likes: sql<number>`(SELECT COUNT(*) FROM "Like" WHERE "tweetId" = ${tweet.id})`,
        retweets: sql<number>`(SELECT COUNT(*) FROM "Retweet" WHERE "tweetId" = ${tweet.id})`,
        replies: sql<number>`(SELECT COUNT(*) FROM "Tweet" WHERE "parentId" = ${tweet.id} AND "deletedAt" IS NULL)`,
      }).from(schema.tweets).where(eq(schema.tweets.id, tweet.id));

      return {
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
        media: tweet.media.map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type as "IMAGE" | "VIDEO",
          altText: m.altText
        })),
        stats: {
          likes: stats.likes || 0,
          replies: stats.replies || 0,
          retweets: stats.retweets || 0,
          views: "0",
        },
        isLiked: (tweet.likes?.length || 0) > 0,
        isRetweeted: (tweet.retweets?.length || 0) > 0,
        isBookmarked: (tweet.bookmarks?.length || 0) > 0,
        location: tweet.locationName ? {
          name: tweet.locationName,
          latitude: tweet.latitude || undefined,
          longitude: tweet.longitude || undefined,
          address: tweet.address || undefined,
          city: tweet.city || undefined,
          country: tweet.country || undefined,
        } : undefined,
        travelDate: tweet.travelDate,
        tags: tweet.tags.map((t: any) => ({
          id: t.travelTag.id,
          name: t.travelTag.name,
          slug: t.travelTag.slug
        })),
        retweetedBy: {
          name: retweetData.user.name || "알 수 없음",
          username: retweetData.user.email.split("@")[0],
          retweetedAt: DateTime.fromISO(retweetData.createdAt).setLocale("ko").toRelative() ?? undefined
        },
        visibility: tweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
      };
    }
  }));

  return {
    session,
    tweets: formattedTweets,
    nextCursor: hasNextPage ? nextCursor : null,
    feedType,
    locationFilter,
  };
}


export function meta({ }: MetaFunction) {
  return [
    { title: "홈 / STAYnC" },
    { name: "description", content: "여행 이야기를 나누는 여행자들의 공간" },
  ];
}


export default function Home() {
  const { session: serverSession, tweets: initialTweets, nextCursor: initialNextCursor, feedType, locationFilter } = useLoaderData<typeof loader>();
  const { data: clientSession } = useSession();
  const fetcher = useFetcher<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tweets, setTweets] = useState(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [locationInput, setLocationInput] = useState(locationFilter || "");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = fetcher.state !== "idle";

  const session = clientSession || serverSession;
  const currentTab = searchParams.get("type") || "for-you";

  // 무한 스크롤: Intersection Observer로 하단 감지
  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          const locationParam = locationFilter ? `&location=${encodeURIComponent(locationFilter)}` : "";
          fetcher.load(`/?cursor=${nextCursor}&type=${currentTab}${locationParam}`);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, fetcher, currentTab, locationFilter]);

  // 추가 트윗 로드 완료 시 상태 업데이트
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const newTweets = fetcher.data.tweets;
      if (newTweets && newTweets.length > 0) {
        setTweets((prev) => [...prev, ...newTweets]);
        setNextCursor(fetcher.data.nextCursor);
      } else {
        setNextCursor(null);
      }
    }
  }, [fetcher.data, fetcher.state]);

  // 탭 변경 시 트윗 목록 초기화
  useEffect(() => {
    setTweets(initialTweets);
    setNextCursor(initialNextCursor);
  }, [initialTweets, initialNextCursor]);

  const handleLocationFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const location = formData.get("location") as string;

    setSearchParams(prev => {
      if (location) {
        prev.set("location", location);
      } else {
        prev.delete("location");
      }
      return prev;
    });
  };

  const clearLocationFilter = () => {
    setLocationInput("");
    setSearchParams(prev => {
      prev.delete("location");
      return prev;
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">홈</h1>
        <div className="flex items-center gap-2">
          <Link to="/search" className="p-2 -mr-2 hover:bg-accent rounded-full transition-colors">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="h-5 w-5" />
          </Link>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <Link
          to="/?type=for-you"
          replace
          className="flex-1 hover:bg-accent/50 transition-colors relative"
        >
          <div className="flex justify-center items-center py-4">
            <span className={cn(
              "font-medium",
              currentTab === "for-you" ? "font-bold text-foreground" : "text-muted-foreground"
            )}>
              추천
            </span>
            {currentTab === "for-you" && (
              <div className="absolute bottom-0 w-14 h-1 bg-primary rounded-full" />
            )}
          </div>
        </Link>
        <Link
          to="/?type=following"
          replace
          className="flex-1 hover:bg-accent/50 transition-colors relative"
        >
          <div className="flex justify-center items-center py-4">
            <span className={cn(
              "font-medium",
              currentTab === "following" ? "font-bold text-foreground" : "text-muted-foreground"
            )}>
              팔로잉
            </span>
            {currentTab === "following" && (
              <div className="absolute bottom-0 w-14 h-1 bg-primary rounded-full" />
            )}
          </div>
        </Link>
      </div>

      {/* Location Filter */}
      <div className="border-b border-border px-4 py-3 bg-secondary/20">
        <form onSubmit={handleLocationFilter} className="relative">
          <HugeiconsIcon
            icon={Location01Icon}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <input
            type="text"
            name="location"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="국가 또는 도시로 필터링 (예: 제주도, 일본, 파리)"
            className="w-full bg-background py-2 pl-10 pr-10 rounded-full border border-border focus:border-primary outline-none transition-all text-sm"
          />
          {locationInput && (
            <button
              type="button"
              onClick={clearLocationFilter}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-muted-foreground" />
            </button>
          )}
        </form>
        {locationFilter && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{locationFilter}</span> 위치의 트윗만 표시 중
          </div>
        )}
      </div>

      {/* Tweet Composer (Only visible on For You or if desired) */}
      <div className="hidden md:block">
        <TweetCompose />
      </div>
      <div className="md:hidden">
        {/* Mobile floating button or simple compose area logic if needed */}
        <TweetCompose />
      </div>

      {/* Feed List */}
      <div className="flex flex-col">
        {tweets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {currentTab === "following" ? (
              session ? "아직 팔로우한 사람이 없거나 새로운 트윗이 없습니다." : "로그인이 필요합니다."
            ) : (
              "아직 작성된 트윗이 없습니다. 첫 번째 이야기를 들려주세요!"
            )}
          </div>
        ) : (
          <>
            {tweets.map((tweet: any) => (
              <TweetCard key={`${tweet.id}-${tweet.retweetedBy?.name || 'orig'}`} {...tweet} />
            ))}

            {/* 무한 스크롤 트리거 */}
            {nextCursor && (
              <div ref={loadMoreRef} className="p-4 flex justify-center">
                {isLoadingMore && <LoadingSpinner size="md" />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
