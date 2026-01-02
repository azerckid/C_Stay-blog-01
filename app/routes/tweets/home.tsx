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

import { prisma } from "~/lib/prisma.server";
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

  // 팔로잉 ID 목록 조회 (탭과 무관하게 권한 체크를 위해 필요)
  if (userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId, status: "ACCEPTED" }, // 승인된 팔로우만
      select: { followingId: true }
    });
    followingIds = follows.map(f => f.followingId);
  }

  // 공개 범위 필터 생성
  let visibilityFilter: any = {};
  if (userId) {
    visibilityFilter = {
      OR: [
        { visibility: "PUBLIC" }, // PUBLIC
        { visibility: "FOLLOWERS", userId: { in: [...followingIds, userId] } }, // 팔로우 중이거나 내 글
        { visibility: "PRIVATE", userId: userId } // 내 비공개 글
      ]
    };
  } else {
    visibilityFilter = {
      visibility: "PUBLIC"
    };
  }

  // 기본 필터 조건 구성
  const baseWhere: any = {
    deletedAt: null,
    parentId: null, // 홈 피드에는 답글 제외 (루트 트윗만 표시)
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  // 탭별 추가 조건 적용
  const andConditions: any[] = [visibilityFilter]; // 공개 범위 필터 적용

  // 위치 필터 추가
  if (locationFilter) {
    andConditions.push({
      OR: [
        { country: { contains: locationFilter } },
        { city: { contains: locationFilter } }
      ]
    });
  }

  const whereCondition: any = {
    ...baseWhere,
    AND: andConditions
  };

  if (feedType === "following") {
    if (!userId) {
      return { session, tweets: [], nextCursor: null, feedType, locationFilter };
    }
    whereCondition.userId = { in: [...followingIds, userId] };
  }

  // 1. 일반 트윗 조회
  const tweetsPromise = prisma.tweet.findMany({
    where: whereCondition,
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      media: true,
      _count: { select: { likes: true, replies: true, retweets: true } },
      likes: userId ? { where: { userId }, select: { userId: true } } : false,
      retweets: userId ? { where: { userId }, select: { userId: true } } : false,
      bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
      tags: { include: { travelTag: true } }
    }
  });

  // 2. 리트윗 조회 (삭제되지 않은 원본 트윗이 있는 경우만)
  const retweetAndConditions: any[] = [visibilityFilter]; // 원본 트윗의 공개 범위 체크

  // 위치 필터를 리트윗 쿼리에도 적용
  if (locationFilter) {
    retweetAndConditions.push({
      OR: [
        { country: { contains: locationFilter } },
        { city: { contains: locationFilter } }
      ]
    });
  }

  const retweetValues: any = {
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    tweet: {
      deletedAt: null,
      AND: retweetAndConditions
    }
  };

  if (feedType === "following" && userId) {
    retweetValues.userId = { in: followingIds };
  }

  const retweetsPromise = prisma.retweet.findMany({
    where: retweetValues,
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      tweet: {
        include: {
          user: true,
          media: true,
          _count: { select: { likes: true, replies: true, retweets: true } },
          likes: userId ? { where: { userId }, select: { userId: true } } : false,
          retweets: userId ? { where: { userId }, select: { userId: true } } : false,
          bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
          tags: { include: { travelTag: true } }
        }
      }
    }
  });

  const [tweets, retweets] = await Promise.all([tweetsPromise, retweetsPromise]);

  // 3. 두 리스트 병합 및 정렬 (createdAt 기준 내림차순)
  const combinedFeed = [
    ...tweets.map(t => ({ type: "tweet", data: t, sortKey: t.createdAt })),
    ...retweets.map(r => ({ type: "retweet", data: r, sortKey: r.createdAt }))
  ].sort((a, b) => b.sortKey.getTime() - a.sortKey.getTime());

  // 4. 페이지네이션 슬라이싱
  const hasNextPage = combinedFeed.length > limit;
  const paginatedFeed = hasNextPage ? combinedFeed.slice(0, limit) : combinedFeed;
  const nextCursor = paginatedFeed.length > 0 ? paginatedFeed[paginatedFeed.length - 1].sortKey.toISOString() : null;

  // 5. 포맷팅
  const formattedTweets = paginatedFeed.map(item => {
    if (item.type === "tweet") {
      const tweet = item.data as typeof tweets[0];
      return {
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
          address: tweet.address || undefined,
          city: tweet.city || undefined,
          country: tweet.country || undefined,
        } : undefined,
        travelDate: tweet.travelDate?.toISOString(),
        tags: tweet.tags.map(t => ({
          id: t.travelTag.id,
          name: t.travelTag.name,
          slug: t.travelTag.slug
        })),
        retweetedBy: undefined,
        visibility: tweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
      };
    } else {
      // 리트윗인 경우
      const retweetData = item.data as typeof retweets[0];
      const tweet = retweetData.tweet; // 원본 트윗
      return {
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
          id: tweet.user.id, // 원본 작성자
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
          address: tweet.address || undefined,
          city: tweet.city || undefined,
          country: tweet.country || undefined,
        } : undefined,
        travelDate: tweet.travelDate?.toISOString(),
        tags: tweet.tags.map(t => ({
          id: t.travelTag.id,
          name: t.travelTag.name,
          slug: t.travelTag.slug
        })),
        retweetedBy: { // 리트윗한 사람 정보
          name: retweetData.user.name || "알 수 없음",
          username: retweetData.user.email.split("@")[0],
          retweetedAt: DateTime.fromJSDate(retweetData.createdAt).setLocale("ko").toRelative() ?? undefined
        },
        visibility: tweet.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE"
      };
    }
  });

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
