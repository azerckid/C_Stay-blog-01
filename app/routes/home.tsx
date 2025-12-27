import type { Route } from "./+types/home";
import { getSession } from "~/lib/auth-utils.server";
import { authClient } from "~/lib/auth-client";
import { useLoaderData, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  return { session };
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "STAYnC - 여행자들의 공간" },
    { name: "description", content: "여행 이야기를 나누는 트위터 클론 서비스" },
  ];
}

export default function Home() {
  const { session } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("로그아웃 되었습니다.");
          navigate("/login");
        },
      },
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🏠 홈 피드</h1>
      {session ? (
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl max-w-sm">
          <p className="mb-2">환영합니다, <span className="font-bold text-blue-400">{session.user.name}</span>님!</p>
          <p className="text-sm text-slate-400 mb-4">{session.user.email}</p>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            로그아웃
          </Button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl max-w-sm">
          <p className="mb-4 text-slate-400">여행자들의 이야기를 더 보려면 로그인하세요.</p>
          <Button onClick={() => navigate("/login")} className="w-full bg-blue-600 hover:bg-blue-500">
            시작하기
          </Button>
        </div>
      )}
    </div>
  );
}
