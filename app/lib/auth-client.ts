import { createAuthClient } from "better-auth/react";

// 서버 사이드에서 window 객체 접근 방지
const getBaseURL = () => {
    if (import.meta.env.VITE_BETTER_AUTH_URL) {
        return import.meta.env.VITE_BETTER_AUTH_URL + "/auth";
    }
    // 클라이언트 사이드에서만 window 사용
    if (typeof window !== "undefined") {
        return window.location.origin + "/auth";
    }
    // 서버 사이드에서는 기본값 사용 (실제로는 클라이언트에서만 사용됨)
    // Better Auth가 서버 사이드에서도 baseURL을 검증하므로 유효한 URL 반환
    return "http://localhost:5173/auth";
};

export const authClient = createAuthClient({
    // 로컬(.env)에서는 VITE_BETTER_AUTH_URL을 사용하고, 
    // 설정이 없는 배포 환경에서는 현재 도메인을 사용합니다.
    // basePath가 '/auth'로 설정되어 있으므로 이를 URL 끝에 포함해야 합니다.
    baseURL: getBaseURL()
});

export const { signIn, signUp, signOut, useSession } = authClient;
