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
   - id, userId, content, imageUrl(s), createdAt, updatedAt 등

2. **`Like`** - 좋아요
   - id, userId, tweetId, createdAt

3. **`Retweet`** (또는 `Repost`) - 리트윗
   - id, userId, tweetId, createdAt

4. **`Follow`** - 팔로우 관계
   - id, followerId, followingId, createdAt

5. **`Reply`** (또는 `Comment`) - 댓글/답글
   - id, userId, tweetId, parentId (대댓글), content, createdAt, updatedAt

6. **`Bookmark`** - 북마크 (선택사항)
   - id, userId, tweetId, createdAt

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

## 데이터베이스 연결 정보

- 데이터베이스: Turso (libSQL)
- ORM: Prisma
- 연결 정보는 환경 변수 (`DATABASE_URL`)로 관리

