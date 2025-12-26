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

> **참고**: 현재 데이터베이스의 실제 테이블 구조는 여기에 문서화되어야 합니다.
> Prisma Studio (`npx prisma studio`) 또는 데이터베이스 연결을 통해 확인한 테이블 목록과 구조를 아래에 추가해주세요.

### 예상 테이블 목록 (트위터 클론 기준)

- `users` - 사용자 정보
- `tweets` - 트윗/게시물
- `likes` - 좋아요
- `retweets` - 리트윗
- `follows` - 팔로우 관계
- `comments` - 댓글 (또는 `replies`)
- 기타 필요한 테이블들...

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

