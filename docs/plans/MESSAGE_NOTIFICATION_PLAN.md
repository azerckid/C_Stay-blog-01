# 쪽지 알림 시스템 구현 상세 계획서 (Message Notification Implementation Plan) - v1.1

본 문서는 STAYnC 서비스 내에서 누락된 쪽지(Direct Message) 알림 및 전역 배지(Badge) 시스템을 기술적으로 완벽하게 구현하기 위한 상세 아키텍처 및 단계별 상세 지침을 제공합니다. (사용자 제안 기반 고도화)

## 1. 개요 및 목적
현재 사용자는 새로운 쪽지를 수신하더라도 해당 메시지 함에 직접 진입하기 전까지는 수신 여부를 알 수 없습니다. 이를 해결하기 위해 앱 내 모든 화면에서 즉각적인 시각적 피드백(숫자 배지)을 제공하고 실시간으로 동기화합니다.

## 2. 현 소스 코드 기반 기술 분석
- **데이터베이스 구조**: `directMessages` 테이블의 `isRead` 필드를 통해 읽음 상태 관리. `dmParticipants`를 통해 대화 참여 여부 확인.
- **실시간 계층**: `pusher-js`를 사용하여 클라이언트 구독 중. 전역 채널 명명 규칙: `user-{userId}`.
- **UI 구조**: `_app.tsx` (Root Loader) → `MainLayout` → `Sidebar`/`BottomNav` 순으로 데이터 전달.

## 3. 상세 단계별 구현 지침

### 3.1 단계 1: 백엔드 카운트 로직 구현 (Data Layer)
- **대상 파일**: `app/routes/_app.tsx`
- **구현 상세**:
  - `loader` 내에서 사용자의 총 읽지 않은 메시지 개수를 구하는 SQL 쿼리 작성.
  - **필수 임포트**: `import { eq, and, not, count, isNull } from "drizzle-orm";`
  - **상세 쿼리**:
    ```typescript
    const [{ value: unreadMessageCount }] = await db.select({ value: count() })
        .from(schema.directMessages)
        .innerJoin(schema.dmParticipants, eq(schema.directMessages.conversationId, schema.dmParticipants.conversationId))
        .where(and(
            eq(schema.dmParticipants.userId, userId),
            isNull(schema.dmParticipants.leftAt),
            not(eq(schema.directMessages.senderId, userId)),
            eq(schema.directMessages.isRead, false)
        ));
    ```
- **누락 방지**: 사용자가 나간 대화방(`leftAt`이 존재하는 경우)의 메시지는 카운트에서 반드시 제외.

### 3.2 단계 2: 실시간 알림 트리거 보강 (Real-time Layer)
- **대상 파일**: `app/routes/messages/api.messages.ts`
- **구현 상세**:
  - 메시지 전송 성공 시, 상대방의 전역 채널(`getUserChannelId(recipientId)`)로 `unread-count-update` 이벤트를 전송.
  - 단순 증분(+1)이 아닌, 최신 전역 읽지 않은 총합을 다시 산출하여 페이로드에 포함하는 것이 정합성 유지에 유리함.

### 3.3 단계 3: 프론트엔드 배지 UI 구현 (View Layer)
- **대상 파일**: `app/components/layout/sidebar.tsx`, `app/components/layout/bottom-nav.tsx`
- **구현 상세**:
  - `MailIcon` (쪽지 메뉴) 옆에 `unreadMessageCount`를 표시하는 배지 컴포넌트 추가.
  - **디자인 가이드**: 소셜 알림 배지와 동일한 스타일(Primary 테두리, White 텍스트, 10px 폰트) 적용.
  - 0개인 경우 `null`을 반환하여 배지 숨김 처리.

### 3.4 단계 4: 전역 Pusher 리스너 및 상태 관리 (MainLayout Integration)
- **대상 파일**: `app/components/layout/main-layout.tsx`
- **구현 위치 정보**:
  - `MainLayout.tsx`는 이미 `unreadCount`(소셜 알림)를 프롭으로 받고 있으므로, 전역 카운트 관리를 위한 최적의 장소임.
  - `message-drawer.tsx`는 개별 채팅 내역에 집중하고, 전역 카운트 배지 갱신 리스너는 `MainLayout`에서 통합 관리함.
- **엣지 케이스 처리 로직**:
  - `unread-count-update` 수신 시, 현재 `MessageDrawer`의 `selectedConvId`와 수신된 메시지의 `conversationId`를 비교함.
  - **조건**: 현재 사용자가 해당 채팅방을 보고 있는 경우 전역 카운트를 올리지 않음 (이미 UI에서 읽음 처리될 것이기 때문).

### 3.5 단계 5: 읽음 처리 동기화 및 전용 엔드포인트 (Consistency Layer)
- **대상 파일**: `app/routes/messages/api.messages.$id.read.ts` (신규 파일 제안)
- **구현 상세**:
  - 특정 대화방 메시지를 '읽음'으로 마킹하는 전용 API 구축.
  - PATCH 요청 완료 후, 해당 사용자의 전역 읽지 않은 총합을 실시간으로 재계산하여 반환하거나 Pusher `unread-count-update`를 재트리거함.
  - **Optimistic UI**: 채팅방 진입 시 프론트엔드에서 즉시 전역 카운트를 해당 대화방의 읽지 않은 개수만큼 즉시 차감하여 즉각적인 피드백 제공.

## 4. 고려 사항 및 보완점
1. **성능 최적화**: 초기 단계는 SQL `count()` 쿼리로 진행하되, 실사용자 증가 시 `dmParticipants` 테이블에 `unreadCount` 캐싱 컬럼을 도입하여 성능 저하 방지.
2. **정합성 유지**: Pusher 이벤트가 유실될 경우를 대비해, 사용자가 앱을 포커스하거나 페이지를 이동할 때마다 안정적으로 서버의 신규 개수를 동기화할 수 있는 폴백(Fallback) 기전 고려.

---
**최종 업데이트**: 2026-01-14  
**작성자**: Antigravity AI  
**상태**: 기술 검토 완료 및 구현 가이드라인 확정
