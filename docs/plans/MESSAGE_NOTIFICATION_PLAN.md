# 쪽지 알림 시스템 구현 상세 계획서 (Message Notification Implementation Plan)

본 문서는 STAYnC 서비스 내에서 누락된 쪽지(Direct Message) 알림 및 전역 배지(Badge) 시스템을 기술적으로 완벽하게 구현하기 위한 상세 아키텍처 및 단계별 상세 지침을 제공합니다.

## 1. 개요 및 목적
현재 사용자는 새로운 쪽지를 수신하더라도 해당 메시지 함에 직접 진입하기 전까지는 수신 여부를 알 수 없습니다. 이를 해결하기 위해 앱 내 모든 화면에서 즉각적인 시각적 피드백(숫자 배지)을 제공하고 실시간으로 동기화합니다.

## 2. 현 소스 코드 기반 기술 분석
- **데이터베이스 구조**: `directMessages` 테이블의 `isRead` 필드를 통해 읽음 상태 관리. `dmParticipants`를 통해 대화 참여 여부 확인.
- **실시간 계층**: `pusher-js`를 사용하여 클라이언트 구독 중. 전역 채널 명명 규칙: `user-{userId}`.
- **UI 구조**: `_app.tsx` (Root Loader) → `MainLayout` → `Sidebar`/`BottomNav` 순으로 데이터 전달.

## 3. 상세 단계별 구현 지침

### 3.1 단계 1: 백엔드 카운트 로직 구현 (Data Layer)
- **대상 파일**: `app/routes/_app.tsx`
- **상세 내용**:
  - `loader` 내에서 사용자의 총 읽지 않은 메시지 개수를 구하는 SQL 쿼리 작성.
  - **중요**: 단순히 `isRead: false`만 체크하는 것이 아니라, `senderId !== currentUserId` 인 것(수신 메시지)만 합산해야 함.
  - **SQL (Drizzle)**:
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
- **상세 내용**:
  - 메시지 전송 성공 시, 상대방의 전역 채널(`getUserChannelId(recipientId)`)로 `unread-count-update` 이벤트를 포함하여 전송.
  - 이벤트 페이로드에 전체 읽지 않은 개수를 다시 계산하여 보내거나, 단순 증분 신호를 전달. (전체 개수를 다시 계산해 보내는 방식이 정합성 측면에서 우수함)

### 3.3 단계 3: 프론트엔드 배지 UI 구현 (View Layer)
- **대상 파일**: `app/components/layout/sidebar.tsx`, `app/components/layout/bottom-nav.tsx`
- **상세 내용**:
  - `MailIcon` (쪽지 메뉴) 옆에 `unreadMessageCount`를 표시하는 `span` 태그 추가.
  - **스타일 가이드**: 소셜 알림과 동일한 디자인 적용 (배경: `primary`, 글자: `white`, 폰트 크기: `10px`, 원형 배지).
  - 0개인 경우 조건부 렌더링을 통해 배지를 숨김 처리.

### 3.4 단계 4: 전역 Pusher 리스너 및 상태 관리 (Sync Layer)
- **대상 파일**: `app/routes/_app.tsx` 또는 `MainLayout.tsx`
- **상세 내용**:
  - `useEffect` 내에서 `pusher.subscribe(userChannel)`를 통해 알림 이벤트를 대기.
  - 새 메시지 이벤트 수신 시 `unreadMessageCount` 상태를 최신화.
  - **엣지 케이스 처리**: 현재 사용자가 해당 채팅방을 열고 있는 상태인 경우, 전역 카운트를 올리지 않거나 즉시 읽음 처리 API를 통해 숫자를 상쇄시키는 로직 검증.

### 3.5 단계 5: 읽음 처리 동기화 로직 (Consistency Layer)
- **대상 파일**: `app/routes/messages/api.messages.conversations.ts` (또는 해당 읽음 처리 액션)
- **상세 내용**:
  - 특정 대화방의 메시지를 읽었을 때(PATCH 요청), 해당 사용자의 **전역 읽지 않은 총합**을 다시 계산하여 반환하거나 Pusher로 동기화.
  - **UI 즉시 반응**: 대화방 진입 시 프론트엔드에서 즉시 전역 카운트를 해당 대화방의 읽지 않은 개수만큼 차감(Optimistic UI).

## 4. 예외 및 고려 사항
1. **성능**: 매번 카운트를 SQL로 합산하는 것은 대규모 메시지 데이터 발생 시 느려질 수 있음. 향후 `dmParticipants` 테이블에 `unreadCount` 캐싱 필드를 두는 방식 검토.
2. **다중 브라우저**: 여러 탭을 띄웠을 때 Pusher 이벤트를 통해 모든 탭의 배지가 동시에 갱신되는지 확인.
3. **PWA 알림**: 향후 Capacitor 연동 시 이 카운트를 네이티브 앱 아이콘 배지와 연동하는 확장성 고려.

## 5. 결론 및 다음 단계
이 계획에 따라 가장 먼저 **단계 1(더 정교한 SQL 쿼리 적용)** 부터 착수할 것을 권장하며, 각 단계 완료 후 실시간 테스트를 통해 정합성을 검증합니다.

---
**최종 업데이트**: 2026-01-14  
**작성자**: Antigravity AI  
**검토 대기**: 사용자 승인 절차 진행 중
