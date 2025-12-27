# 환경 변수 설정 확인 가이드

## .env 파일 확인 방법

### 1. 직접 확인 (터미널)

프로젝트 루트 디렉토리에서 다음 명령어를 실행하세요:

```bash
# .env 파일 내용 확인 (보안상 민감한 정보는 마스킹)
cat .env | grep -E "DATABASE_URL|TURSO_AUTH_TOKEN"

# 또는 모든 환경 변수 확인 (전체 내용 출력)
cat .env
```

### 2. 필수 환경 변수 형식

`.env` 파일에는 다음 형식으로 환경 변수가 설정되어 있어야 합니다:

```env
# Turso 데이터베이스 연결 URL
# 형식: libsql://[database-name]-[organization].turso.io?authToken=[token]
DATABASE_URL="libsql://nomad-ai-[organization].turso.io?authToken=[your-token]"

# 또는 별도로 TURSO_AUTH_TOKEN 설정 (선택사항)
# TURSO_AUTH_TOKEN="[your-turso-auth-token]"
```

**참고**: `DATABASE_URL`에 `authToken`이 포함되어 있으면 `TURSO_AUTH_TOKEN`은 별도로 설정하지 않아도 됩니다.

## 데이터베이스 연결 테스트 방법

### 방법 1: Prisma Studio 사용 (권장)

데이터베이스 연결을 테스트하고 데이터를 확인하는 가장 쉬운 방법입니다:

```bash
# Prisma Studio 실행
npx prisma studio
```

성공적으로 연결되면 브라우저에서 `http://localhost:5555`가 자동으로 열립니다.
- 연결이 실패하면 에러 메시지가 표시됩니다.

### 방법 2: Prisma DB Pull (스키마 동기화 확인)

원격 데이터베이스의 스키마를 가져와서 연결을 확인합니다:

```bash
# 원격 DB 스키마 확인 (기존 schema.prisma를 덮어쓰지 않음)
npx prisma db pull --force
```

### 방법 3: Turso CLI로 직접 확인

Turso CLI를 사용하여 데이터베이스 연결을 직접 확인합니다:

```bash
# 데이터베이스 목록 확인
turso db list

# 특정 데이터베이스의 테이블 목록 확인
turso db shell nomad-ai "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 간단한 쿼리 테스트
turso db shell nomad-ai "SELECT COUNT(*) as user_count FROM User;"
```

### 방법 4: Node.js 스크립트로 연결 테스트

간단한 테스트 스크립트를 만들어 연결을 확인할 수 있습니다:

**`scripts/test-db-connection.ts`** 파일 생성:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // 간단한 쿼리 실행
    const userCount = await prisma.user.count();
    console.log("✅ 데이터베이스 연결 성공!");
    console.log(`📊 User 테이블의 레코드 수: ${userCount}`);
    
    // Tweet 테이블도 확인
    const tweetCount = await prisma.tweet.count();
    console.log(`📊 Tweet 테이블의 레코드 수: ${tweetCount}`);
  } catch (error) {
    console.error("❌ 데이터베이스 연결 실패:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

실행:

```bash
# tsx 또는 ts-node 필요
npx tsx scripts/test-db-connection.ts

# 또는 ts-node 사용
npx ts-node scripts/test-db-connection.ts
```

### 방법 5: 환경 변수 확인 (Node.js)

환경 변수가 제대로 로드되는지 확인하는 스크립트:

```typescript
// scripts/check-env.ts
import "dotenv/config";

console.log("환경 변수 확인:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ 설정됨" : "❌ 설정 안됨");

// DATABASE_URL 형식 확인
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.startsWith("libsql://")) {
    console.log("✅ 올바른 Turso libSQL 형식입니다");
  } else {
    console.log("⚠️ DATABASE_URL 형식이 올바르지 않을 수 있습니다");
  }
}

console.log("TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN ? "✅ 설정됨" : "❌ 설정 안됨 (선택사항)");
```

## 문제 해결

### 연결 실패 시 확인 사항

1. **DATABASE_URL 형식 확인**
   - `libsql://`로 시작해야 합니다
   - `authToken` 쿼리 파라미터가 포함되어 있어야 합니다

2. **인터넷 연결 확인**
   - Turso는 클라우드 데이터베이스이므로 인터넷 연결이 필요합니다

3. **인증 토큰 유효성 확인**
   - Turso 대시보드에서 토큰이 유효한지 확인
   - 토큰이 만료되었거나 권한이 없는 경우 새로 발급

4. **데이터베이스 이름 확인**
   - `turso db list` 명령어로 실제 데이터베이스 이름 확인
   - DATABASE_URL의 데이터베이스 이름과 일치하는지 확인

5. **.env 파일 위치 확인**
   - `.env` 파일이 프로젝트 루트 디렉토리에 있어야 합니다
   - `prisma.config.ts`나 `package.json`과 같은 레벨에 있어야 합니다

## 참고

- `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다
- 프로덕션 환경에서는 환경 변수를 다른 방식으로 관리해야 합니다 (예: Vercel, AWS Secrets Manager 등)
- 팀원과 공유할 때는 `.env.example` 파일을 만들어 형식만 공유하는 것이 좋습니다

