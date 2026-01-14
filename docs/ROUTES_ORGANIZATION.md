# Routes 폴더 구조 및 정리 방안

## 현재 상태

- **총 파일 수**: 42개 (API 라우트 약 24개, 페이지 라우트 약 18개)
- **문제점**: routes 폴더에 파일이 많아 관리가 어려움

## React Router v7의 제약사항

React Router v7은 **파일 기반 라우팅**을 사용하므로:
- 파일명이 URL 경로와 직접 연결됨
- 파일을 이동하면 `routes.ts` 파일도 수정 필요
- 폴더 구조 변경 시 URL 구조도 변경될 수 있음

## 현재 파일 목록

### API 라우트 (24개)
```
api.ai-travel-log.ts
api.auth.ts
api.bookmarks.collections.ts
api.bookmarks.ts
api.follows.ts
api.likes.ts
api.messages.$id.read.ts
api.messages.conversations.$id.read.ts
api.messages.conversations.$id.ts
api.messages.conversations.$id.typing.ts
api.messages.conversations.ts
api.messages.ts
api.notifications.ts
api.retweets.ts
api.tags.ts
api.travel-plan-items.$id.ts
api.travel-plan-items.ts
api.travel-plans.$id.ts
api.travel-plans.ts
api.travel-stats.$userId.ts
api.tweets.ts
api.upload.ts
api.users.search.ts
api.users.ts
```

### 페이지 라우트 (18개)
```
_app.tsx
bookmarks.tsx
home.tsx
login.tsx
messages.$conversationId.tsx
messages.index.tsx
messages.tsx
notifications.tsx
profile.tsx
search.tsx
signup.tsx
tags.$slug.tsx
travel-plans.$id.tsx
travel-plans.tsx
tweet.$tweetId.tsx
user.$userId.follows.tsx
user.$userId.tsx
tweet/ (디렉토리)
```

## 정리 방안

### 옵션 1: 현재 구조 유지 + 문서화 (권장)

**장점**:
- URL 구조 변경 없음
- `routes.ts` 수정 불필요
- React Router v7의 표준 구조 유지

**방법**:
- 파일명 앞에 주석으로 그룹 표시
- README 파일로 구조 문서화 (현재 문서)
- 파일명 순서를 논리적으로 정렬 (관련 파일끼리 묶기)

**파일명 정렬 제안**:
```
_app.tsx
home.tsx
login.tsx
signup.tsx
profile.tsx

# Search & Discovery
search.tsx
tags.$slug.tsx

# User
user.$userId.tsx
user.$userId.follows.tsx

# Content
tweet.$tweetId.tsx
tweet/

# Messages
messages.tsx
messages.index.tsx
messages.$conversationId.tsx

# Travel
travel-plans.tsx
travel-plans.$id.tsx

# Features
bookmarks.tsx
notifications.tsx

# API - Auth
api.auth.ts

# API - Users
api.users.ts
api.users.search.ts

# API - Tweets
api.tweets.ts
api.likes.ts
api.retweets.ts

# API - Bookmarks
api.bookmarks.ts
api.bookmarks.collections.ts

# API - Follows
api.follows.ts

# API - Messages
api.messages.ts
api.messages.$id.read.ts
api.messages.conversations.ts
api.messages.conversations.$id.ts
api.messages.conversations.$id.read.ts
api.messages.conversations.$id.typing.ts

# API - Notifications
api.notifications.ts

# API - Travel
api.travel-plans.ts
api.travel-plans.$id.ts
api.travel-plan-items.ts
api.travel-plan-items.$id.ts
api.travel-stats.$userId.ts

# API - Tags
api.tags.ts

# API - AI
api.ai-travel-log.ts

# API - Upload
api.upload.ts
```

### 옵션 2: 기능별 하위 폴더로 그룹화 (비권장)

**단점**:
- `routes.ts` 파일 대대적 수정 필요
- URL 경로 변경 가능성
- React Router v7의 표준 구조에서 벗어남
- 파일 import 경로 변경 필요

**예시 구조**:
```
routes/
  pages/
    _app.tsx
    home.tsx
    login.tsx
    ...
  api/
    auth.ts
    users.ts
    tweets.ts
    ...
```

### 옵션 3: 파일명 prefix로 그룹화 (부분 적용 가능)

**방법**:
- 파일명에 숫자 prefix 추가 (예: `01_api.auth.ts`)
- IDE에서 자동 정렬됨

**단점**:
- URL에 영향 없지만 파일명이 다소 복잡해짐
- 기존 파일명 변경으로 인한 Git 히스토리 복잡도 증가

## 권장 사항

**옵션 1 (현재 구조 유지 + 문서화)을 권장합니다.**

이유:
1. React Router v7의 표준 구조 유지
2. URL 구조 변경 없음
3. 기존 코드 수정 최소화
4. 문서화로 충분히 관리 가능

**추가 제안**:
- 이 문서를 `docs/` 폴더에 유지
- 각 파일 상단에 기능 그룹 주석 추가 (선택사항)
- `routes.ts` 파일에 섹션 주석 추가로 그룹화 표시

## routes.ts 구조 개선 제안

`routes.ts` 파일에 섹션 주석을 추가하여 그룹화:

```typescript
export default [
    // Layout
    layout("routes/_app.tsx", [
        // Pages
        index("routes/home.tsx"),
        route("search", "routes/search.tsx"),
        // ...
        
        // Messages
        route("messages", "routes/messages.tsx", [
            // ...
        ]),
    ]),
    
    // API - Auth
    route("api/auth/*", "routes/api.auth.ts", { id: "api-auth" }),
    
    // API - Content
    route("api/tweets", "routes/api.tweets.ts"),
    route("api/likes", "routes/api.likes.ts"),
    // ...
];
```

