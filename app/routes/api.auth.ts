import { auth } from "~/lib/auth";
import type { Route } from "./+types/api.auth";

export async function action({ request }: Route.ActionArgs) {
    const url = new URL(request.url);
    // 사용자 지정 콜백 주소를 Better Auth 표준 주소로 리라이트
    if (url.pathname === "/auth/google/callback") {
        url.pathname = "/api/auth/callback/google";
    } else if (url.pathname === "/auth/kakao/callback") {
        url.pathname = "/api/auth/callback/kakao";
    }

    // 리라이트된 주소로 새 요청 객체 생성
    const newRequest = new Request(url.toString(), request);
    return auth.handler(newRequest);
}

export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url);
    // 사용자 지정 콜백 주소를 Better Auth 표준 주소로 리라이트
    if (url.pathname === "/auth/google/callback") {
        url.pathname = "/api/auth/callback/google";
    } else if (url.pathname === "/auth/kakao/callback") {
        url.pathname = "/api/auth/callback/kakao";
    }

    const newRequest = new Request(url.toString(), request);
    return auth.handler(newRequest);
}
