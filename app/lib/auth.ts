import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.server";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", // Turso/libSQL uses sqlite provider in prisma
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            redirectURI: process.env.GOOGLE_REDIRECT_URL,
        },
        kakao: {
            clientId: process.env.KAKAO_CLIENT_ID as string,
            clientSecret: process.env.KAKAO_CLIENT_SECRET as string,
            redirectURI: process.env.KAKAO_REDIRECT_URL,
        },
    },
});
