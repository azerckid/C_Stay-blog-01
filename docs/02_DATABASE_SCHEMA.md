# Database Schema

이 문서는 STAYnC 프로젝트의 데이터베이스 스키마와 저장 로직을 설명합니다.

## 현재 상태

**프로젝트는 Drizzle ORM을 사용하여 Turso (libSQL) 데이터베이스와 연결합니다.**

2026년 1월에 Prisma에서 Drizzle ORM으로 마이그레이션을 완료했습니다. 이제 모든 데이터베이스 작업은 Drizzle을 통해 수행됩니다.

## 스키마 관리 전략

- Drizzle ORM을 사용한 타입 안전한 스키마 정의
- 스키마 파일: `app/db/schema.ts`
- 변경사항은 Drizzle Kit을 통해 마이그레이션 관리
- Better Auth와의 통합을 위한 스키마 매핑 유지

## ORM 및 도구

- **ORM**: Drizzle ORM (v0.45.1)
- **데이터베이스**: Turso (libSQL/SQLite)
- **마이그레이션 도구**: Drizzle Kit (v0.31.8)
- **인증**: Better Auth with Drizzle Adapter

## 스키마 파일 구조

스키마는 `app/db/schema.ts` 파일에 정의되어 있으며, 다음과 같이 구성됩니다:

1. **인증 관련 테이블**: `users`, `accounts`, `sessions`, `verifications`
2. **트윗 및 콘텐츠 테이블**: `tweets`, `media`, `likes`, `retweets`
3. **사용자 상호작용 테이블**: `follows`, `bookmarks`, `bookmarkCollections`
4. **여행 관련 테이블**: `travelPlans`, `travelPlanItems`, `travelTags`, `tweetTravelTags`
5. **메시징 테이블**: `directMessages`, `dmConversations`, `dmParticipants`
6. **기타 테이블**: `notifications`, `tweetEmbeddings` 등

## 주요 테이블 구조

### 1. User (사용자)

```typescript
export const users = sqliteTable("User", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    password: text("password"),
    name: text("name"),
    image: text("image"),
    provider: text("provider").default("local").notNull(),
    snsId: text("snsId"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    avatarUrl: text("avatarUrl"),
    status: text("status").default("OFFLINE").notNull(),
    bio: text("bio"),
    coverImage: text("coverImage"),
    isPrivate: integer("isPrivate", { mode: "boolean" }),
    // ... 기타 필드
});
```

### 2. Tweet (트윗)

```typescript
export const tweets = sqliteTable("Tweet", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    content: text("content").notNull(),
    parentId: text("parentId"),
    isRetweet: integer("isRetweet", { mode: "boolean" }).default(false).notNull(),
    originalTweetId: text("originalTweetId"),
    deletedAt: text("deletedAt"),
    locationName: text("locationName"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    address: text("address"),
    travelDate: text("travelDate"),
    country: text("country"),
    city: text("city"),
    travelPlanId: text("travelPlanId"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    visibility: text("visibility").default("PUBLIC"),
}, (table) => ({
    userIdIdx: index("Tweet_userId_idx").on(table.userId),
    parentIdIdx: index("Tweet_parentId_idx").on(table.parentId),
    createdAtIdx: index("Tweet_createdAt_idx").on(table.createdAt),
    deletedAtIdx: index("Tweet_deletedAt_idx").on(table.deletedAt),
    countryCityIdx: index("Tweet_country_city_idx").on(table.country, table.city),
    travelDateIdx: index("Tweet_travelDate_idx").on(table.travelDate),
    locationIdx: index("Tweet_location_idx").on(table.latitude, table.longitude),
}));
```

### 3. Media (미디어)

```typescript
export const media = sqliteTable("Media", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    altText: text("altText"),
    order: integer("order").default(0).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    publicId: text("publicId"),
}, (table) => ({
    tweetIdIdx: index("Media_tweetId_idx").on(table.tweetId),
    tweetIdOrderIdx: index("Media_tweetId_order_idx").on(table.tweetId, table.order),
}));
```

### 4. Like (좋아요)

```typescript
export const likes = sqliteTable("Like", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});
```

### 5. Follow (팔로우)

```typescript
export const follows = sqliteTable("Follow", {
    id: text("id").primaryKey(),
    followerId: text("followerId").notNull(),
    followingId: text("followingId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    status: text("status").default('ACCEPTED'),
});
```

## Relations (관계 정의)

Drizzle은 `relations()` 함수를 사용하여 테이블 간 관계를 정의합니다:

```typescript
export const usersRelations = relations(users, ({ many }) => ({
    tweets: many(tweets),
    accounts: many(accounts),
    sessions: many(sessions),
    followedBy: many(follows, { relationName: "following" }),
    following: many(follows, { relationName: "follower" }),
    likes: many(likes),
    retweets: many(retweets),
    bookmarks: many(bookmarks),
    bookmarkCollections: many(bookmarkCollections),
    receivedNotifications: many(notifications, { relationName: "recipient" }),
    issuedNotifications: many(notifications, { relationName: "issuer" }),
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
    user: one(users, { fields: [tweets.userId], references: [users.id] }),
    media: many(media),
    likes: many(likes),
    retweets: many(retweets),
    replies: many(tweets, { relationName: "replies" }),
    parent: one(tweets, { fields: [tweets.parentId], references: [tweets.id], relationName: "replies" }),
    tags: many(tweetTravelTags),
    bookmarks: many(bookmarks),
    travelPlan: one(travelPlans, { fields: [tweets.travelPlanId], references: [travelPlans.id] }),
    embedding: one(tweetEmbeddings),
    notifications: many(notifications),
}));
```

## 데이터베이스 클라이언트 사용법

### 기본 사용

```typescript
import { db } from "~/db";
import { users, tweets } from "~/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// 조회
const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
});

// Relations 포함 조회
const tweet = await db.query.tweets.findFirst({
    where: eq(tweets.id, tweetId),
    with: {
        user: true,
        media: true,
        likes: true,
    },
});

// 삽입
const newTweet = await db.insert(tweets).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    content: "Hello, World!",
    updatedAt: new Date().toISOString(),
}).returning();

// 업데이트
const updatedUser = await db.update(users)
    .set({ name: "New Name" })
    .where(eq(users.id, userId))
    .returning();

// 삭제
await db.delete(tweets)
    .where(eq(tweets.id, tweetId));

// 트랜잭션
await db.transaction(async (tx) => {
    await tx.insert(tweets).values({ /* ... */ });
    await tx.insert(media).values({ /* ... */ });
});
```

## Better Auth 통합

Better Auth는 Drizzle 어댑터를 통해 데이터베이스와 연결됩니다:

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

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
    // ... 기타 설정
});
```

## 마이그레이션 관리

### 스키마 변경 후 마이그레이션 생성

```bash
# 마이그레이션 파일 생성
npx drizzle-kit generate

# 마이그레이션 적용 (개발 환경)
npx drizzle-kit push

# 또는 마이그레이션 파일로 적용
npx drizzle-kit migrate
```

### 스키마 검증

```bash
# 스키마 문법 검증
npx drizzle-kit check
```

## 인덱스 전략

주요 인덱스는 성능 최적화를 위해 다음과 같이 설정되어 있습니다:

- **Tweet 테이블**: `userId`, `parentId`, `createdAt`, `deletedAt`, `country/city`, `travelDate`, `latitude/longitude`
- **Media 테이블**: `tweetId`, `tweetId/order`
- **Like, Retweet 테이블**: `userId`, `tweetId`
- **Follow 테이블**: `followerId`, `followingId`
- **Notification 테이블**: `recipientId`, `issuerId`, `tweetId`

## Soft Delete

`Tweet` 테이블은 `deletedAt` 필드를 사용하여 논리 삭제를 지원합니다:

- `deletedAt`이 NULL이면 활성 트윗
- `deletedAt`이 설정되면 삭제된 트윗
- 쿼리 시 `WHERE deletedAt IS NULL` 조건 사용

```typescript
const activeTweets = await db.query.tweets.findMany({
    where: and(
        eq(tweets.userId, userId),
        isNull(tweets.deletedAt)
    ),
});
```

## AI 하이브리드 검색 (RAG) 시스템

### TweetEmbedding 테이블

```typescript
export const tweetEmbeddings = sqliteTable("TweetEmbedding", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull().unique(),
    vector: blob("vector").notNull(), // 768차원 벡터 (BLOB)
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});
```

- **임베딩 모델**: Google Gemini `text-embedding-004` (768차원)
- **저장 형식**: BLOB (Float32Array를 Uint8Array로 변환)
- **검색**: Turso의 벡터 확장 기능 사용 (`vector_distance_cos`)

## 환경 변수

데이터베이스 연결은 다음 환경 변수를 사용합니다:

- `TURSO_DATABASE_URL`: Turso 데이터베이스 URL
- `TURSO_AUTH_TOKEN`: Turso 인증 토큰 (선택사항)

## 참고 자료

- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- [Drizzle Kit 문서](https://orm.drizzle.team/kit-docs/overview)
- [Turso 문서](https://docs.turso.tech/)
- [Better Auth 문서](https://www.better-auth.com/docs)

---

**마지막 업데이트**: 2026-01-08  
**ORM**: Drizzle ORM v0.45.1  
**데이터베이스**: Turso (libSQL)
