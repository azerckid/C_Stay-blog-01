import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData, useFetcher, useSearchParams, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Search01Icon } from "@hugeicons/core-free-icons";
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
  const limit = 20;

  let followingIds: string[] = [];

  // 팔로잉 피드인 경우, 팔로우한 유저 ID 목록 조회
  if (userId && feedType === "following") {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });
    followingIds = follows.map(f => f.followingId);
  }

  // 필터 조건 구성
  const whereCondition: any = {
    deletedAt: null,
    parentId: null, // 홈 피드에는 답글 제외 (루트 트윗만 표시)
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  // 팔로잉 필터 적용
  if (feedType === "following") {
    if (!userId) {
      // 비로그인 상태에서 팔로잉 탭 요청 시 빈 배열 반환 (또는 처리 로직)
      return { session, tweets: [], nextCursor: null, feedType };
    }
    // 내가 팔로우한 사람들의 글 + 내 글(선택사항, 보통 포함함)
    whereCondition.userId = { in: [...followingIds, userId] };
  }

  // 1. 일반 트윗 조회
  const tweetsPromise = prisma.tweet.findMany({
    where: whereCondition,
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      media: true, // Include media
      _count: { select: { likes: true, replies: true, retweets: true } },
      likes: userId ? { where: { userId }, select: { userId: true } } : false,
      retweets: userId ? { where: { userId }, select: { userId: true } } : false,
    }
  });

  // 2. 리트윗 조회 (삭제되지 않은 원본 트윗이 있는 경우만)
  // 팔로잉 피드일 경우: 내가 팔로우한 사람이 "리트윗한" 것도 보여줄 것인가? -> 보통 YES.
  const retweetWhereCondition: any = {
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    tweet: { deletedAt: null }
  };

  if (feedType === "following" && userId) {
    // 팔로잉한 사람이 리트윗한 것들
    retweetWhereCondition.userId = { in: followingIds };
  }

  const retweetsPromise = prisma.retweet.findMany({
    where: retweetWhereCondition,
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: true, // 리트윗한 사람
      tweet: { // 원본 트윗
        include: {
          user: true, // 원본 작성자
          media: true, // Include media for retweeted tweet
          _count: { select: { likes: true, replies: true, retweets: true } },
          likes: userId ? { where: { userId }, select: { userId: true } } : false,
          retweets: userId ? { where: { userId }, select: { userId: true } } : false,
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
          city: tweet.city,
          country: tweet.country,
          travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined,
        retweetedBy: undefined
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
          city: tweet.city,
          country: tweet.country,
          travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined,
        retweetedBy: { // 리트윗한 사람 정보
          name: retweetData.user.name || "알 수 없음",
          username: retweetData.user.email.split("@")[0],
          retweetedAt: DateTime.fromJSDate(retweetData.createdAt).setLocale("ko").toRelative() ?? undefined
        }
      };
    }
  });

  return {
    session,
    tweets: formattedTweets,
    nextCursor: hasNextPage ? nextCursor : null,
    feedType,
  };
}

export function meta({ }: MetaFunction) {
  return [
    { title: "홈 / STAYnC" },
    { name: "description", content: "여행 이야기를 나누는 여행자들의 공간" },
  ];
}


export default function Home() {
  const { session: serverSession, tweets: initialTweets, nextCursor: initialNextCursor, feedType } = useLoaderData<typeof loader>();
  const { data: clientSession } = useSession();
  const fetcher = useFetcher<typeof loader>();
  const [searchParams] = useSearchParams();

  const [tweets, setTweets] = useState(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
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
          fetcher.load(`/?cursor=${nextCursor}&type=${currentTab}`);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, fetcher, currentTab]);

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

  // 탭 변경 또는 초기 데이터 변경 시 상태 초기화
  useEffect(() => {
    setTweets(initialTweets);
    setNextCursor(initialNextCursor);
  }, [initialTweets, initialNextCursor, feedType]);

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
