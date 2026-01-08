import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

// 서버리스 환경에서 클라이언트 재사용을 위한 global 변수
declare global {
    var __db__: LibSQLDatabase<typeof schema> | undefined;
    var __libsql_client__: Client | undefined;
}

// 환경 변수 검증
function validateEnv() {
    if (!process.env.TURSO_DATABASE_URL) {
        throw new Error(
            "TURSO_DATABASE_URL 환경 변수가 설정되지 않았습니다. " +
            "Vercel 환경 변수 설정을 확인해주세요."
        );
    }
}

// 데이터베이스 클라이언트 초기화
function initializeDb(): LibSQLDatabase<typeof schema> {
    validateEnv();

    const connectionConfig = {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    };

    // 서버리스 환경(Vercel)에서는 각 함수 인스턴스마다 새 클라이언트 생성
    // 개발 환경에서는 global을 사용하여 재사용
    if (process.env.NODE_ENV === "production") {
        const client = createClient(connectionConfig);
        return drizzle(client, { schema });
    } else {
        // 개발 환경: global을 사용하여 클라이언트 재사용
        if (!global.__libsql_client__) {
            global.__libsql_client__ = createClient(connectionConfig);
        }
        if (!global.__db__) {
            global.__db__ = drizzle(global.__libsql_client__, { schema });
        }
        return global.__db__;
    }
}

// 데이터베이스 인스턴스 초기화 및 export
export const db = initializeDb();
