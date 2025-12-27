import { createAuthClient } from "better-auth/react";

// Better Auth 클라이언트 baseURL 명시적 설정
// 런타임에 현재 도메인을 자동 감지하여 서버와 동일한 baseURL 사용
const baseURL = typeof window !== "undefined" ? window.location.origin : undefined;

export const authClient = createAuthClient({
    baseURL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
