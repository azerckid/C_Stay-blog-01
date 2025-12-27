import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { TweetCompose } from "~/components/tweet/tweet-compose";
import { TweetCard } from "~/components/tweet/tweet-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  return { session };
}

export function meta({ }: MetaFunction) {
  return [
    { title: "홈 / STAYnC" },
    { name: "description", content: "여행 이야기를 나누는 여행자들의 공간" },
  ];
}

const MOCK_TWEETS = [
  {
    id: "1",
    user: { name: "여행전문가", username: "traveler_1", image: null },
    content: "이번 주말에 다녀온 제주도 여행 사진입니다! 날씨가 정말 좋았어요. 🌊☀️",
    createdAt: "2시간 전",
    stats: { replies: 12, retweets: 45, likes: 120, views: "1.2K" },
    media: [{ type: "IMAGE" as const, url: "/mock-image.jpg" }]
  },
  {
    id: "2",
    user: { name: "맛집탐방가", username: "foodie_jeju", image: null },
    content: "서귀포에서 찾은 인생 흑돼지집... 고기 질이 장난 아니네요. 추천합니다!",
    createdAt: "5시간 전",
    stats: { replies: 8, retweets: 23, likes: 89, views: "850" }
  },
  {
    id: "3",
    user: { name: "STAYnC 공식", username: "staync_official", image: null },
    content: "STAYnC 베타 테스트에 참여해 주셔서 감사합니다. 여러분의 소중한 여행 경험을 공유해 주세요!",
    createdAt: "1일 전",
    stats: { replies: 56, retweets: 112, likes: 432, views: "5.4K" }
  }
];

export default function Home() {
  const { session: serverSession } = useLoaderData<typeof loader>();
  const { data: clientSession } = useSession();

  const session = clientSession || serverSession;

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
        {MOCK_TWEETS.map((tweet) => (
          <TweetCard key={tweet.id} {...tweet} />
        ))}
      </div>
    </div>
  );
}
