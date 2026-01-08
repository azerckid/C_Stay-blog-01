import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

// 개발 환경에서 baseURL 명시적 설정 (Better Auth가 redirectURI 생성 시 사용)
const getBaseURL = () => {
    if (process.env.NODE_ENV === "development") {
        // 개발 환경에서는 항상 로컬 호스트 사용
        return "http://localhost:5173";
    }
    // 프로덕션에서는 환경 변수 사용 또는 Vercel URL 자동 감지
    if (process.env.BETTER_AUTH_URL) {
        return process.env.BETTER_AUTH_URL;
    }
    // Vercel 환경 변수 사용 (자동으로 제공됨)
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    // 프로덕션 환경에서도 명시적 URL이 없으면 undefined (Better Auth가 자동 감지 시도)
    return undefined;
};

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            user: schema.users,
            account: schema.accounts,
            session: schema.sessions,
            verification: schema.verifications,
        },
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
        kakao: {
            clientId: process.env.KAKAO_CLIENT_ID || "",
            clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
        },
    },
    basePath: "/auth",
    baseURL: getBaseURL(), // 개발 환경에서는 명시적으로 로컬 호스트 설정
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: process.env.NODE_ENV === "development"
        ? ["http://localhost:5173", "http://127.0.0.1:5173"]
        : undefined,
});
