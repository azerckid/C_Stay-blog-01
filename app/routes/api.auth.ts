import { auth } from "~/lib/auth";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
    try {
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
    } catch (error) {
        console.error("Auth Action Error:", error);
        return data(
            {
                error: "인증 처리 중 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        // 사용자 지정 콜백 주소를 Better Auth 표준 주소로 리라이트
        if (url.pathname === "/auth/google/callback") {
            url.pathname = "/api/auth/callback/google";
        } else if (url.pathname === "/auth/kakao/callback") {
            url.pathname = "/api/auth/callback/kakao";
        }

        const newRequest = new Request(url.toString(), request);
        return auth.handler(newRequest);
    } catch (error) {
        console.error("Auth Loader Error:", error);
        return data(
            {
                error: "인증 처리 중 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
