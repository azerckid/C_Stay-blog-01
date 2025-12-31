# Phase 12.5 메시지 기능 문서 검토 리포트

**검토일**: 2024년  
**검토 대상**: Phase 12.5: 메시지 (Messages) 기능 - X(Twitter) 스타일

---

## 📋 문서 검토 결과

### ✅ 잘 작성된 부분

1. **구조적 명확성**
   - UI First 접근 방식이 명확하게 정의됨
   - 단계별 구현 계획이 체계적으로 구성됨
   - 백엔드와 프론트엔드 분리가 명확함

2. **데이터베이스 스키마**
   - `DirectMessage`, `DMConversation`, `DMParticipant` 모델 설계가 적절함
   - Soft Delete 지원 (`deletedBySender`, `deletedByReceiver`)
   - 그룹 채팅 지원 (`isGroup`, `groupName`, `isAdmin`)
   - 인덱스 최적화 고려됨

3. **Floating Drawer 개념**
   - 우측 하단 고정형 채팅 드로어 개념이 명확함
   - 최소화/최대화 상태 전환 계획이 구체적임

4. **실시간 통신**
   - Pusher Channels 사용 계획이 명확함
   - WebSocket 기반 실시간 메시징 전략이 적절함

---

## ⚠️ 발견된 문제점 및 개선 사항

### 1. API 엔드포인트 누락

**문제점:**
- 메시지 삭제 API가 명시되지 않음
- 대화 삭제/나가기 API가 없음
- 메시지 수정 API가 없음
- 대화 검색 API가 없음
- 그룹 채팅 멤버 관리 API가 부족함

**권장 추가 사항:**
```markdown
- **메시지 관리 (추가 필요)**:
  - `DELETE /api/messages/:id`: 메시지 삭제 (Soft Delete)
  - `PATCH /api/messages/:id`: 메시지 수정 (선택사항)
- **대화 관리 (추가 필요)**:
  - `DELETE /api/messages/conversations/:id`: 대화 삭제/나가기
  - `GET /api/messages/conversations/search?q=...`: 대화 검색
  - `POST /api/messages/conversations/:id/participants`: 그룹 멤버 초대
  - `DELETE /api/messages/conversations/:id/participants/:userId`: 그룹 멤버 제거
  - `PATCH /api/messages/conversations/:id/group-name`: 그룹명 변경
```

### 2. UI 컴포넌트 누락

**문제점:**
- 미디어(이미지/동영상) 전송 UI가 명시되지 않음
- 읽음 확인(Read Receipt) UI가 없음
- 타이핑 인디케이터(Typing Indicator)가 없음
- 그룹 채팅 멤버 목록/관리 UI가 없음
- 메시지 반응(이모지) 기능이 없음

**권장 추가 사항:**
```markdown
- [ ] **채팅 인터페이스 컴포넌트 (추가 필요)**:
  - **미디어 전송**: 이미지/동영상 첨부 및 미리보기
  - **읽음 확인**: "읽음" 표시 (체크마크 2개)
  - **타이핑 인디케이터**: 상대방이 입력 중일 때 표시
  - **메시지 반응**: 이모지 반응 추가/제거
  - **메시지 메뉴**: 복사, 삭제, 수정 옵션
- [ ] **그룹 채팅 관리 UI**:
  - 그룹 멤버 목록 표시
  - 멤버 초대/제거 UI
  - 그룹명 변경 UI
  - 그룹 나가기 UI
```

### 3. 확인 방법(Verification Methods) 누락

**문제점:**
- 대부분의 작업 항목에 "확인 방법"이 없음
- 다른 Phase와 일관성이 없음

**권장 추가 사항:**
각 작업 항목에 다음과 같은 확인 방법을 추가:
```markdown
- **확인 방법**:
  - [구체적인 테스트 시나리오]
  - [예상되는 UI/동작]
  - [에러 케이스 처리]
```

### 4. 데이터베이스 스키마 개선 필요

**문제점:**
- 미디어 메시지 지원이 없음 (이미지/동영상)
- 메시지 반응(이모지) 지원이 없음
- 메시지 수정 이력이 없음

**권장 추가 사항:**
```prisma
model DirectMessage {
  // ... 기존 필드
  mediaId      String?  // Media 테이블과의 관계 (선택사항)
  editedAt    DateTime? // 수정된 시간
  reactions   MessageReaction[] // 이모지 반응
}

model MessageReaction {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  emoji     String   // 이모지 유니코드 또는 이모지 ID
  createdAt DateTime @default(now())

  message   DirectMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}
```

### 5. 프라이버시 설정 필드 누락

**문제점:**
- `User` 테이블에 메시지 프라이버시 필드 확장이 언급되었지만 구체적인 필드명이 없음

**권장 추가 사항:**
```prisma
model User {
  // ... 기존 필드
  messagePrivacySetting String @default("EVERYONE") // "NONE" | "VERIFIED" | "EVERYONE"
  spamFilterEnabled     Boolean @default(true)
  encryptionEnabled     Boolean @default(false)
}
```

### 6. React Router v7 관련 수정 필요

**문제점:**
- 문서에 "Remix Loader/Action"이라고 명시되어 있으나, 프로젝트는 React Router v7을 사용함

**권장 수정:**
```markdown
- [ ] **상세 API 엔드포인트 구현 (React Router v7 Loader/Action)**
  - React Router v7의 `loader`와 `action` 함수 사용
```

### 7. 에러 처리 및 엣지 케이스

**문제점:**
- 에러 처리 시나리오가 명시되지 않음
- 네트워크 오류, Pusher 연결 실패 등의 처리 방법이 없음

**권장 추가 사항:**
```markdown
- [ ] **에러 처리 및 오프라인 지원**:
  - 네트워크 오류 시 재시도 로직
  - Pusher 연결 실패 시 폴백(Polling) 전략
  - 오프라인 메시지 큐잉
  - 메시지 전송 실패 시 사용자 알림
```

### 8. 성능 최적화 고려사항

**문제점:**
- 대화 목록 정렬 기준이 명확하지 않음
- 메시지 페이징 전략이 간단히만 언급됨

**권장 추가 사항:**
```markdown
- [ ] **성능 최적화**:
  - 대화 목록 정렬: `lastMessageAt` 기준 내림차순
  - 메시지 페이징: 커서 기반 무한 스크롤
  - 대화 목록 가상화(Virtualization) 고려
  - 이미지/동영상 지연 로딩(Lazy Loading)
```

### 9. 보안 고려사항

**문제점:**
- 메시지 암호화 구현 방법이 구체적이지 않음
- 스팸 필터링 로직이 명시되지 않음

**권장 추가 사항:**
```markdown
- [ ] **보안 및 프라이버시**:
  - 메시지 암호화 구현 방법 (클라이언트 사이드 암호화)
  - 스팸 필터링 알고리즘 (차단된 사용자, 키워드 필터)
  - 메시지 요청 제한 (하루 N개 제한 등)
```

### 10. 모바일 반응형 고려사항

**문제점:**
- 모바일에서 Floating Drawer의 동작이 구체적이지 않음
- 모바일 터치 제스처가 명시되지 않음

**권장 추가 사항:**
```markdown
- [ ] **모바일 최적화**:
  - Floating Drawer 스와이프 제스처 (위로 드래그하여 확장)
  - 모바일에서 전체 화면 메시지 뷰 전환
  - 키보드 표시 시 입력 바 자동 스크롤
  - 하단 네비게이션과의 충돌 방지
```

---

## 📝 구체적인 개선 제안

### 제안 1: API 엔드포인트 섹션 보완

현재 문서의 API 섹션을 다음과 같이 확장:

```markdown
- [ ] **상세 API 엔드포인트 구현 (React Router v7 Loader/Action)**
  - **대화 관리**:
    - `GET /api/messages/conversations?tab=all|requests`: 리스트 조회
    - `GET /api/messages/conversations/search?q=...`: 대화 검색
    - `POST /api/messages/conversations`: 1:1 또는 그룹 대화 생성
    - `PATCH /api/messages/conversations/:id/accept`: 요청 수락 로직
    - `DELETE /api/messages/conversations/:id`: 대화 삭제/나가기
    - `PATCH /api/messages/conversations/:id/group-name`: 그룹명 변경
  - **메시지 관리**:
    - `POST /api/messages`: 메시지 전송 및 상대방 알림 트리거
    - `GET /api/messages/conversations/:id?cursor=...`: 무한 스크롤 페이징
    - `PATCH /api/messages/:id/read`: 읽음 상태 업데이트
    - `PATCH /api/messages/:id`: 메시지 수정 (선택사항)
    - `DELETE /api/messages/:id`: 메시지 삭제 (Soft Delete)
  - **그룹 채팅 관리**:
    - `POST /api/messages/conversations/:id/participants`: 멤버 초대
    - `DELETE /api/messages/conversations/:id/participants/:userId`: 멤버 제거
    - `PATCH /api/messages/conversations/:id/participants/:userId/admin`: 관리자 권한 부여/해제
```

### 제안 2: UI 컴포넌트 섹션 보완

```markdown
- [ ] **채팅 인터페이스 컴포넌트 (보완)**
  - **헤더**: 뒤로가기, 상대 프로필 요약, 설정 아이콘, 그룹 멤버 목록 버튼
  - **프로필 정보 카드**: 대화 시작 부분에 표시되는 "프로필 보기" 카드
  - **메시지 버블**: 
    - 날짜별 그룹핑 및 본인(오른쪽)/상대(왼쪽) 구분
    - 읽음 확인 표시 (체크마크 2개)
    - 메시지 반응(이모지) 표시
    - 메시지 메뉴 (복사, 삭제, 수정)
  - **타이핑 인디케이터**: 상대방이 입력 중일 때 "입력 중..." 표시
  - **입력 바**: 
    - "+" 버튼 (미디어 첨부, 이모지 선택)
    - 텍스트 입력
    - 전송 버튼
    - 미디어 미리보기 (첨부 시)
```

### 제안 3: 확인 방법 추가

각 작업 항목에 확인 방법을 추가하여 다른 Phase와 일관성 유지:

```markdown
- [ ] **메시지 더미 데이터(Mock Data) 정의**
  - 대화 목록(Conversations), 상세 메시지(Messages), 사용자(Users) 모의 데이터 생성
  - '전체' 및 '요청' 탭 구분을 위한 데이터 상태 포함
  - **확인 방법**:
    - 더미 데이터가 올바른 구조로 생성되었는지 확인
    - '전체' 탭과 '요청' 탭에 각각 적절한 데이터가 표시되는지 확인
    - TypeScript 타입이 올바르게 정의되었는지 확인
```

---

## 🎯 우선순위별 개선 사항

### 높은 우선순위
1. ✅ API 엔드포인트 보완 (메시지 삭제, 대화 삭제/나가기)
2. ✅ 확인 방법 추가 (모든 작업 항목)
3. ✅ 미디어 전송 기능 추가
4. ✅ React Router v7 명시

### 중간 우선순위
5. ⚠️ 읽음 확인 UI
6. ⚠️ 타이핑 인디케이터
7. ⚠️ 그룹 채팅 멤버 관리 UI
8. ⚠️ 데이터베이스 스키마 확장 (미디어, 반응)

### 낮은 우선순위
9. ⚠️ 메시지 반응(이모지) 기능
10. ⚠️ 메시지 수정 기능
11. ⚠️ 에러 처리 및 오프라인 지원
12. ⚠️ 성능 최적화 상세 계획

---

## ✅ 최종 평가

### 문서 품질: **B+ (85/100)**

**강점:**
- 구조적 명확성과 단계별 계획이 우수함
- UI First 접근 방식이 적절함
- 데이터베이스 스키마 설계가 기본적으로 잘 되어 있음
- 실시간 통신 전략이 명확함

**개선 필요:**
- API 엔드포인트 보완 필요
- UI 컴포넌트 상세 명세 필요
- 확인 방법 추가 필요
- 일부 기능 누락 (미디어, 반응, 타이핑 인디케이터)

**결론:**
문서는 기본적으로 잘 작성되었으나, X(Twitter)의 완전한 메시지 기능을 재현하기 위해서는 위의 개선 사항들을 반영하는 것이 권장됩니다.

---

**검토 완료일**: 2024년  
**다음 단계**: 개선 사항 반영 후 재검토 권장

