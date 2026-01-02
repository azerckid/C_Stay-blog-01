import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Vercel 서버리스 환경에서도 Prisma 클라이언트를 재사용하기 위해 global 사용
// 각 함수 인스턴스 내에서 동일한 클라이언트를 재사용
export const prisma =
    globalForPrisma.prisma ||
    (() => {
        // 환경 변수 검증
        if (!process.env.TURSO_DATABASE_URL) {
            throw new Error(
                "TURSO_DATABASE_URL 환경 변수가 설정되지 않았습니다. Vercel 환경 변수 설정을 확인해주세요."
            );
        }

        const adapter = new PrismaLibSql({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        const client = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        });

        // Vercel 서버리스 환경에서도 global에 저장하여 재사용
        globalForPrisma.prisma = client;
        return client;
    })();
