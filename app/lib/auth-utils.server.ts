import { auth } from "./auth";

/**
 * 서버 사이드 로더/액션에서 세션을 가져오기 위한 유틸리티
 */
export async function getSession(request: Request) {
    return await auth.api.getSession({
        headers: request.headers,
    });
}

/**
 * 인증이 필요한 페이지에서 세션이 없으면 로그인 페이지로 리다이렉트
 */
export async function requireUser(request: Request) {
    const session = await getSession(request);
    if (!session) {
        const url = new URL(request.url);
        const searchParams = new URLSearchParams();
        searchParams.set("redirectTo", url.pathname);

        // login 페이지로 리다이렉트 (필요시 원래 가려던 주소를 쿼리 스트링으로 전달)
        throw new Response(null, {
            status: 302,
            headers: {
                Location: `/login?${searchParams.toString()}`,
            },
        });
    }
    return session;
}
