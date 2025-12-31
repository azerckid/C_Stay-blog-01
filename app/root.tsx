import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useSearchParams,
  data,
} from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { getSession } from "~/lib/auth-utils.server";

import type { Route } from "./+types/root";
import "./app.css";
import { Toaster } from "./components/ui/sonner";

import { ThemeProvider } from "next-themes";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const session = await getSession(request);
  return data({
    user: session?.user || null,
    ENV: {
      PUSHER_KEY: process.env.PUSHER_KEY,
      PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
    },
  });
};

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // 1. URL 파라미터 체크 (기존 방식 유지)
    const toastMsg = searchParams.get("toast");
    const toastType = searchParams.get("type") || "success";

    // 2. 로컬 스토리지 체크
    const localToastMsg = typeof window !== "undefined" ? localStorage.getItem("toast-message") : null;
    const localToastType = typeof window !== "undefined" ? localStorage.getItem("toast-type") || "success" : "success";

    const msg = toastMsg || localToastMsg;
    const type = toastMsg ? toastType : localToastType;

    if (msg) {
      // 컴포넌트 마운트 후 아주 약간의 지연을 주어 Toaster가 준비되도록 함
      const timer = setTimeout(() => {
        if (type === "success") {
          toast.success(msg);
        } else if (type === "error") {
          toast.error(msg);
        }

        // 사용 후 정리
        if (toastMsg) {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("toast");
          newParams.delete("type");
          setSearchParams(newParams, { replace: true });
        }

        if (localToastMsg) {
          localStorage.removeItem("toast-message");
          localStorage.removeItem("toast-type");
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
