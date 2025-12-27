import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { authClient, useSession, signOut } from "~/lib/auth-client";
import { useLoaderData, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  return { session };
}

export function meta({ }: MetaFunction) {
  return [
    { title: "STAYnC - 여행자들의 공간" },
    { name: "description", content: "여행 이야기를 나누는 트위터 클론 서비스" },
  ];
}

export default function Home() {
  const { session: serverSession } = useLoaderData<typeof loader>();
  const { data: clientSession, isPending } = useSession();
  const navigate = useNavigate();

  // 클라이언트 세션 로딩 중에는 서버 세션을 우선 사용
  const session = clientSession || serverSession;

  const handleLogout = async () => {
    if (!window.confirm("정말 로그아웃 하시겠습니까?")) return;

    try {
      // 1. Better Auth 로그아웃 요청
      await signOut();

      // 2. 성공 시 즉각 피드백 및 페이지 강제 새로고침 (세션 클리어 보장)
      toast.success("로그아웃 되었습니다.");
      setTimeout(() => {
        window.location.replace("/login");
      }, 500);
    } catch (error) {
      console.error("Logout Error:", error);
      // 오류가 나더라도 강제로 로그인 페이지로 이동시켜 세션 초기화 유도
      window.location.replace("/login");
    }
  };

  // session이 있는 경우(서버 혹은 클라이언트) 즉시 렌더링
  const showLoading = isPending && !session;

  if (showLoading) {
    return <div className="p-8 text-slate-400">인증 확인 중...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          🏠 홈 피드
        </h1>

        {session ? (
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">
                {session.user.name?.[0] || "U"}
              </div>
              <div>
                <p className="font-bold text-lg text-blue-400">{session.user.name}님</p>
                <p className="text-sm text-slate-400">{session.user.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-300 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                ✅ 현재 로그인 되어 있습니다. 로그인을 테스트하시려면 아래 버튼을 눌러주세요.
              </p>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full py-6 font-bold text-lg shadow-lg hover:shadow-red-500/20 transition-all"
              >
                로그아웃 (테스트용)
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
            <p className="text-slate-400 mb-6">로그인 상태가 아닙니다. 다시 테스트해 보세요!</p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-blue-600 hover:bg-blue-500 py-6 font-bold text-lg"
            >
              로그인 하러 가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
