import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

// 환경 변수 검증 및 정규화 헬퍼 함수
function normalizeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    // 끝 슬래시 제거
    return url.replace(/\/+$/, "");
}

// 소셜 프로바이더 설정 (환경 변수가 있을 때만 활성화)
const socialProviders: Record<string, any> = {};

// Google OAuth 설정
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectURI: normalizeUrl(process.env.GOOGLE_REDIRECT_URL),
    };
}

// Kakao OAuth 설정
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    socialProviders.kakao = {
        clientId: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
        redirectURI: normalizeUrl(process.env.KAKAO_REDIRECT_URL),
    };
}

// Better Auth 초기화
// baseURL이 없으면 런타임에 현재 요청의 origin을 사용하도록 설정
const baseURL = normalizeUrl(process.env.BETTER_AUTH_URL);

// auth 변수를 명시적으로 타입 선언
let auth: ReturnType<typeof betterAuth>;

try {
    auth = betterAuth({
        database: drizzleAdapter(db, {
            provider: "sqlite",
            schema: {
                user: schema.users,
                account: schema.accounts,
                session: schema.sessions,
                verification: schema.verifications,
            },
        }),
        ...(baseURL && { baseURL }), // baseURL이 있을 때만 전달
        emailAndPassword: {
            enabled: true,
        },
        socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
    });
} catch (error) {
    console.error("Better Auth 초기화 실패:", error);
    throw new Error(
        `Better Auth 초기화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
    );
}

export { auth };
