import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.server";

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

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", // Turso/libSQL uses sqlite provider in prisma
    }),
    baseURL: normalizeUrl(process.env.BETTER_AUTH_URL),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
});
