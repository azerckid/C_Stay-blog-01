import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // 로컬(.env)에서는 VITE_BETTER_AUTH_URL을 사용하고, 
    // 설정이 없는 배포 환경에서는 현재 도메인을 사용합니다.
    // basePath가 '/auth'로 설정되어 있으므로 이를 URL 끝에 포함해야 합니다.
    baseURL: (import.meta.env.VITE_BETTER_AUTH_URL || window.location.origin) + "/auth"
});

export const { signIn, signUp, signOut, useSession } = authClient;
