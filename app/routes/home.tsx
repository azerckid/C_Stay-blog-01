import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Image01Icon, SentIcon, AiBrain01Icon } from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

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

      {/* Tweet Composer Mockup (Phase 3 UI only) */}
      <div className="p-4 border-b border-border flex gap-3">
        <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0 border border-border overflow-hidden">
          {session?.user?.image ? (
            <img src={session.user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">
              {session?.user?.name?.[0] || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            placeholder="무슨 일이 일어나고 있나요?"
            className="w-full bg-transparent text-xl outline-none resize-none pt-2 min-h-[100px]"
          />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-1 text-primary">
              <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} className="h-5 w-5" />
              </button>
            </div>
            <button
              disabled
              className="bg-primary text-white font-bold py-2 px-5 rounded-full opacity-50 cursor-not-allowed"
            >
              게시하기
            </button>
          </div>
        </div>
      </div>

      {/* Feed Mockup */}
      <div className="flex flex-col">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-border hover:bg-accent/20 transition-colors cursor-pointer flex gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0 border border-border" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="font-bold hover:underline">여행전문가_{i}</span>
                <span className="text-muted-foreground text-sm">@traveler_{i} · {i}시간 전</span>
              </div>
              <p className="text-[15px] leading-normal">
                이번 주말에 다녀온 제주도 여행 사진입니다! 날씨가 정말 좋았어요.
                #제주도 #여행 #바다
              </p>
              {i % 2 === 0 && (
                <div className="mt-3 aspect-video rounded-2xl bg-muted border border-border overflow-hidden">
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground italic">
                    [여행지 이미지 {i}]
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 max-w-sm text-muted-foreground">
                <button className="group flex items-center gap-2 hover:text-primary transition-colors">
                  <div className="p-2 group-hover:bg-primary/10 rounded-full">
                    <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs">{i * 3}</span>
                </button>
                <div className="group flex items-center gap-2 hover:text-green-500 transition-colors text-xs">
                  리트윗 {i * 7}
                </div>
                <div className="group flex items-center gap-2 hover:text-red-500 transition-colors text-xs">
                  좋아요 {i * 12}
                </div>
                <div className="group flex items-center gap-2 hover:text-primary transition-colors text-xs">
                  조회수 {i * 1.5}K
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
