import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData, useFetcher } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { TweetCard } from "~/components/tweet/tweet-card";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useEffect, useRef, useState } from "react";

import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = 20;

  const tweets = await prisma.tweet.findMany({
    where: {
      deletedAt: null, // Soft Delete: 삭제되지 않은 트윗만 조회
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}), // 커서 기반 페이지네이션 (createdAt 기준)
    },
    take: limit + 1, // 다음 페이지 존재 여부 확인을 위해 +1
    orderBy: { createdAt: "desc" },
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

  const hasNextPage = tweets.length > limit;
  const paginatedTweets = hasNextPage ? tweets.slice(0, limit) : tweets;
  const nextCursor = paginatedTweets.length > 0 ? paginatedTweets[paginatedTweets.length - 1].createdAt.toISOString() : null;

  const formattedTweets = paginatedTweets.map(tweet => ({
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
  }));

  return { 
    session, 
    tweets: formattedTweets,
    nextCursor: hasNextPage ? nextCursor : null,
  };
}

export function meta({ }: MetaFunction) {
  return [
    { title: "홈 / STAYnC" },
    { name: "description", content: "여행 이야기를 나누는 여행자들의 공간" },
  ];
}


export default function Home() {
  const { session: serverSession, tweets: initialTweets, nextCursor: initialNextCursor } = useLoaderData<typeof loader>();
  const { data: clientSession } = useSession();
  const fetcher = useFetcher<typeof loader>();
  const [tweets, setTweets] = useState(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = fetcher.state !== "idle";

  const session = clientSession || serverSession;

  // 무한 스크롤: Intersection Observer로 하단 감지
  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          fetcher.load(`/?cursor=${nextCursor}`);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, fetcher]);

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

  // 초기 데이터 변경 시 상태 초기화 (예: 새 트윗 작성 후)
  useEffect(() => {
    setTweets(initialTweets);
    setNextCursor(initialNextCursor);
  }, [initialTweets, initialNextCursor]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">홈</h1>
        <button className="p-2 hover:bg-accent rounded-full transition-colors">
          <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="h-5 w-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button className="flex-1 py-4 hover:bg-accent/50 transition-colors relative font-bold">
          추천
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
        </button>
        <button className="flex-1 py-4 hover:bg-accent/50 transition-colors text-muted-foreground font-medium">
          팔로잉
        </button>
      </div>

      {/* Tweet Composer */}
      <TweetCompose />

      {/* Feed List */}
      <div className="flex flex-col">
        {tweets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            아직 작성된 트윗이 없습니다. 첫 번째 이야기를 들려주세요!
          </div>
        ) : (
          <>
            {tweets.map((tweet) => (
              <TweetCard key={tweet.id} {...tweet} />
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
