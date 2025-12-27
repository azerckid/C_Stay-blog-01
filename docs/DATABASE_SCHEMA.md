# Database Schema

이 문서는 STAYnC 프로젝트의 데이터베이스 스키마와 저장 로직을 설명합니다.

## 현재 상태

**Turso 데이터베이스에 이미 필요한 테이블들이 생성되어 있습니다.**

프로젝트는 기존 데이터베이스 구조를 최대한 활용하면서, 필요에 따라 컬럼이나 테이블을 추가하는 방식으로 진행합니다.

## 스키마 관리 전략

- 기존 테이블 구조를 최대한 활용
- 새로운 기능 추가 시 기존 테이블에 컬럼 추가 우선 고려
- 필수적인 경우에만 새로운 테이블 생성
- 변경사항은 Prisma 스키마와 마이그레이션으로 관리

## 현재 테이블 구조

### 기존 테이블 목록 (2025-01-17 기준)

데이터베이스에 다음 테이블들이 이미 존재합니다:

#### 트위터 클론에서 활용 가능한 테이블

1. **`User`** - 사용자 정보
   ```sql
   CREATE TABLE "User" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "email" TEXT NOT NULL,
       "password" TEXT,
       "name" TEXT,
       "image" TEXT,
       "provider" TEXT NOT NULL DEFAULT 'local',
       "snsId" TEXT,
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt" DATETIME NOT NULL,
       "emailVerified" BOOLEAN NOT NULL DEFAULT false,
       "avatarUrl" TEXT,
       "status" TEXT NOT NULL DEFAULT 'OFFLINE'
   );
   ```

2. **`account`** - OAuth 계정 정보 (Auth.js용)
   ```sql
   CREATE TABLE "account" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "accountId" TEXT NOT NULL,
       "providerId" TEXT NOT NULL,
       "userId" TEXT NOT NULL,
       "accessToken" TEXT,
       "refreshToken" TEXT,
       "idToken" TEXT,
       "accessTokenExpiresAt" DATETIME,
       "refreshTokenExpiresAt" DATETIME,
       "scope" TEXT,
       "password" TEXT,
       "createdAt" DATETIME NOT NULL,
       "updatedAt" DATETIME NOT NULL,
       FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   ```

3. **`session`** - 세션 정보 (Auth.js용)
   ```sql
   CREATE TABLE "session" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "expiresAt" DATETIME NOT NULL,
       "token" TEXT NOT NULL,
       "createdAt" DATETIME NOT NULL,
       "updatedAt" DATETIME NOT NULL,
       "ipAddress" TEXT,
       "userAgent" TEXT,
       "userId" TEXT NOT NULL,
       FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   ```

4. **`verification`** - 이메일 인증 정보 (Auth.js용)

#### 기존 테이블 (여행/채팅 관련, 트위터 클론에서 미사용)

- `AgentExecution` - AI 에이전트 실행 정보
- `Conversation` - 대화방
- `FlightDeal` - 항공권 딜
- `Hotel` - 호텔 정보
- `Message` - 메시지/채팅
- `PublicTransportRoute` - 대중교통 경로
- `Room` - 채팅방
- `RoomMember` - 채팅방 멤버
- `Todo` - 할 일 목록
- `TravelPlan` - 여행 계획
- `TravelPlanItem` - 여행 계획 아이템
- `TravelPreference` - 여행 선호도
- `hotel_embeddings` - 호텔 임베딩

### 트위터 클론에 필요한 추가 테이블

다음 테이블들은 트위터 클론 기능을 위해 새로 추가해야 합니다:

1. **`Tweet`** (또는 `Post`) - 트윗/게시물
   ```sql
   CREATE TABLE "Tweet" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "userId" TEXT NOT NULL,
       "content" TEXT NOT NULL,
       "parentId" TEXT,  -- 답글일 경우 원본 트윗의 ID (Self-referencing)
       "isRetweet" BOOLEAN NOT NULL DEFAULT false,  -- 리트윗 여부 (선택적)
       "originalTweetId" TEXT,  -- 리트윗일 경우 원본 트윗 ID (선택적)
       "deletedAt" DATETIME,  -- Soft Delete (선택사항)
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt" DATETIME NOT NULL,
       FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("parentId") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("originalTweetId") REFERENCES "Tweet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
   );
   
   -- 인덱스
   CREATE INDEX "Tweet_userId_idx" ON "Tweet"("userId");
   CREATE INDEX "Tweet_parentId_idx" ON "Tweet"("parentId");
   CREATE INDEX "Tweet_createdAt_idx" ON "Tweet"("createdAt" DESC);
   CREATE INDEX "Tweet_deletedAt_idx" ON "Tweet"("deletedAt") WHERE "deletedAt" IS NULL;
   ```

2. **`Media`** - 트윗에 첨부된 미디어 (이미지/동영상)
   ```sql
   CREATE TABLE "Media" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "tweetId" TEXT NOT NULL,
       "type" TEXT NOT NULL,  -- 'IMAGE' 또는 'VIDEO'
       "url" TEXT NOT NULL,
       "thumbnailUrl" TEXT,
       "altText" TEXT,
       "order" INTEGER NOT NULL DEFAULT 0,
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY ("tweetId") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   
   -- 인덱스
   CREATE INDEX "Media_tweetId_idx" ON "Media"("tweetId");
   CREATE INDEX "Media_tweetId_order_idx" ON "Media"("tweetId", "order");
   ```

3. **`Like`** - 좋아요
   ```sql
   CREATE TABLE "Like" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "userId" TEXT NOT NULL,
       "tweetId" TEXT NOT NULL,
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("tweetId") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       UNIQUE("userId", "tweetId")  -- 중복 좋아요 방지
   );
   
   -- 인덱스
   CREATE INDEX "Like_userId_idx" ON "Like"("userId");
   CREATE INDEX "Like_tweetId_idx" ON "Like"("tweetId");
   CREATE INDEX "Like_userId_tweetId_idx" ON "Like"("userId", "tweetId");
   ```

4. **`Retweet`** (또는 `Repost`) - 리트윗
   ```sql
   CREATE TABLE "Retweet" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "userId" TEXT NOT NULL,
       "tweetId" TEXT NOT NULL,
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("tweetId") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       UNIQUE("userId", "tweetId")  -- 중복 리트윗 방지
   );
   
   -- 인덱스
   CREATE INDEX "Retweet_userId_idx" ON "Retweet"("userId");
   CREATE INDEX "Retweet_tweetId_idx" ON "Retweet"("tweetId");
   CREATE INDEX "Retweet_userId_tweetId_idx" ON "Retweet"("userId", "tweetId");
   ```
   *참고: 단순 리트윗은 별도 테이블로 관리하거나, Tweet 테이블에 포함할 수 있음. 현재는 별도 테이블 유지 또는 Tweet 테이블 통합 고려.*

5. **`Follow`** - 팔로우 관계
   ```sql
   CREATE TABLE "Follow" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "followerId" TEXT NOT NULL,  -- 팔로우하는 사용자
       "followingId" TEXT NOT NULL,  -- 팔로우받는 사용자
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY ("followerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("followingId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       UNIQUE("followerId", "followingId"),  -- 중복 팔로우 방지
       CHECK("followerId" != "followingId")  -- 자기 자신 팔로우 방지 (libSQL에서 지원하는 경우)
   );
   
   -- 인덱스
   CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
   CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
   CREATE INDEX "Follow_followerId_followingId_idx" ON "Follow"("followerId", "followingId");
   ```
   *참고: 자기 자신 팔로우 방지는 애플리케이션 레벨에서도 검증해야 합니다.*

6. **`Bookmark`** - 북마크 (선택사항)
   ```sql
   CREATE TABLE "Bookmark" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "userId" TEXT NOT NULL,
       "tweetId" TEXT NOT NULL,
       "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       FOREIGN KEY ("tweetId") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
       UNIQUE("userId", "tweetId")  -- 중복 북마크 방지
   );
   
   -- 인덱스
   CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");
   CREATE INDEX "Bookmark_tweetId_idx" ON "Bookmark"("tweetId");
   CREATE INDEX "Bookmark_userId_tweetId_idx" ON "Bookmark"("userId", "tweetId");
   ```

*참고: `Reply` 테이블은 `Tweet` 테이블의 자기 참조(`parentId`)로 통합하여 관리합니다.*

## 스키마 변경 가이드

### 새 컬럼 추가

1. Prisma 스키마 (`prisma/schema.prisma`)에 컬럼 정의 추가
2. 마이그레이션 생성: `npx prisma migrate dev --name add_[컬럼명]_to_[테이블명]`
3. 이 문서에 변경사항 기록

### 새 테이블 추가

1. Prisma 스키마에 모델 추가
2. 마이그레이션 생성: `npx prisma migrate dev --name create_[테이블명]`
3. 이 문서에 테이블 구조 기록

## Prisma 스키마

Prisma 스키마 파일 (`prisma/schema.prisma`)은 기존 데이터베이스 구조를 반영하여 작성해야 합니다.

```prisma
// prisma/schema.prisma 예시 구조
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "libsql"
  url      = env("DATABASE_URL")
}

// 기존 테이블들에 대한 모델 정의
// ...
```

## 마이그레이션

- 개발 환경: `npx prisma migrate dev`
- 프로덕션: `npx prisma migrate deploy`
- 마이그레이션 히스토리 확인: `npx prisma migrate status`

## 성능 최적화 및 제약조건

### 인덱스 전략

위의 테이블 정의에 포함된 인덱스들은 다음과 같은 쿼리 패턴을 최적화합니다:

- **Tweet 테이블**:
  - `userId`: 사용자별 트윗 조회
  - `parentId`: 답글 조회
  - `createdAt`: 시간순 정렬
  - `deletedAt`: Soft Delete된 트윗 제외 (WHERE 조건 최적화)

- **Media 테이블**:
  - `tweetId`: 트윗별 미디어 조회
  - `tweetId, order`: 순서대로 미디어 조회

- **Like, Retweet, Bookmark 테이블**:
  - `userId`: 사용자별 좋아요/리트윗/북마크 조회
  - `tweetId`: 트윗별 좋아요/리트윗/북마크 개수 조회
  - 복합 인덱스: 사용자가 특정 트윗에 좋아요/리트윗/북마크했는지 확인

- **Follow 테이블**:
  - `followerId`: 팔로워 목록 조회
  - `followingId`: 팔로잉 목록 조회
  - 복합 인덱스: 팔로우 관계 확인

### 제약조건

1. **UNIQUE 제약조건**:
   - `Like(userId, tweetId)`: 중복 좋아요 방지
   - `Retweet(userId, tweetId)`: 중복 리트윗 방지
   - `Bookmark(userId, tweetId)`: 중복 북마크 방지
   - `Follow(followerId, followingId)`: 중복 팔로우 방지

2. **FOREIGN KEY 제약조건**:
   - 모든 외래키는 CASCADE DELETE로 설정 (부모 삭제 시 자식도 삭제)
   - `Tweet.originalTweetId`는 SET NULL (원본 트윗 삭제 시 리트윗은 유지)

3. **애플리케이션 레벨 제약조건**:
   - 자기 자신 팔로우 방지: `Follow` 테이블에서 `followerId != followingId` 검증
   - 트윗 내용 최대 길이 제한 (예: 280자)
   - 미디어 개수 제한 (예: 트윗당 최대 4개)

### Soft Delete

`Tweet` 테이블에 `deletedAt` 필드를 추가하여 논리 삭제를 지원합니다:

- `deletedAt`이 NULL이면 활성 트윗
- `deletedAt`이 설정되면 삭제된 트윗 (표시하지 않음)
- 물리 삭제 대신 논리 삭제로 데이터 히스토리 보존
- 쿼리 시 `WHERE deletedAt IS NULL` 조건 추가

**장점:**
- 삭제된 트윗의 좋아요, 댓글 등 관련 데이터 보존
- 복구 가능
- 감사(Audit) 목적

**고려사항:**
- 모든 트윗 조회 쿼리에 `WHERE deletedAt IS NULL` 조건 필요
- 인덱스를 활용하여 성능 최적화

## 데이터베이스 연결 정보

- 데이터베이스: Turso (libSQL)
- ORM: Prisma
- 연결 정보는 환경 변수 (`DATABASE_URL`)로 관리

