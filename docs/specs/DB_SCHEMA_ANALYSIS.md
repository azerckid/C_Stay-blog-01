# Database Schema Analysis (Actual vs Prisma)

**Date**: 2026-01-08  
**Source Database**: Turso `nomad-ai`  
**Prisma Schema**: `prisma/schema.prisma`

## 1. 개요
현재 Turso 공유 데이터베이스(`nomad-ai`)와 프로젝트의 `prisma/schema.prisma` 파일 간에 중대한 불일치가 발견되었습니다. 실제 DB에는 Prisma 스키마에 정의되지 않은 수많은 테이블과 필드가 존재합니다.

## 2. 주요 불일치 사항

### 2.1 Prisma에 없는 테이블 (총 16개)
다음 테이블들은 실제 DB에는 존재하지만 Prisma 스키마에는 정의되어 있지 않습니다.
- `AgentExecution`: 에이전트 실행 로그
- `Character`, `CharacterMedia`, `CharacterStat`: 캐릭터 및 페르소나 관련
- `Conversation`: AI 캐릭터와의 대화 내역 (기존 `DMConversation`과 별개인 듯함)
- `FanPost`: 팬 게시물 관련
- `GiftLog`, `Item`, `UserInventory`: 아이템 및 선물 시스템
- `Message`, `MessageLike`: AI 대화 메시지 관련
- `Mission`, `UserMission`: 미션 시스템
- `Notice`: 공지사항
- `Payment`: 결제 내역 (매우 복잡한 필드 구조)
- `SystemLog`: 시스템 로그

### 2.2 기존 테이블의 필드 차이
- **User**: `checkInTime`, `pushSubscription`, `subscriptionTier`, `subscriptionStatus`, `subscriptionId`, `credits`, `role` 등 다수의 필드가 실제 DB에만 존재함.
- **DirectMessage**: `mediaUrl`, `mediaType` 필드가 실제 DB에만 존재함.
- **TravelPlanItem**: `status` 필드의 기본값이 Prisma 정의와 다를 수 있음.

### 2.3 인덱스 및 제약 조건
- 실제 DB에는 `User_subscriptionId_unique`, `session_token_unique` 등 명시적인 유니크 인덱스가 설정되어 있으나, Prisma에서 관리되지 않는 경우가 많음.

## 3. 대응 전략

- **Drizzle 스키마 정의 시 기준**: `prisma/schema.prisma`가 아닌, 추출된 `backup/schema_ddl.sql`의 **실제 CREATE TABLE 문을 최우선 기준**으로 삼습니다.
- **데이터 보존**: 모든 테이블(Prisma에 없는 테이블 포함)을 신규 DB `cstay-blog`로 마이그레이션해야 기능 손실을 막을 수 있습니다.
- **Better Auth 호환성**: `User`, `account`, `session`, `verification` 테이블은 Better Auth의 요구사항과 실제 DB 구조를 모두 만족하도록 재구성합니다.

## 4. 위험 요소
- Prisma에 정의되지 않은 테이블들을 사용하는 비즈니스 로직이 코드 내에 숨겨져 있을 가능성이 있습니다 (예: RAW SQL 사용 또는 타 프로젝트의 서비스).
- **결정 필요**: 이 프로젝트에서 사용하지 않는 테이블(타 프로젝트 전용)도 모두 `cstay-blog`로 옮길 것인지, 아니면 이 프로젝트에 필요한 것만 선별할 것인지 확인이 필요합니다.
