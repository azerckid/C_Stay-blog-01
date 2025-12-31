# UI Design System

STAYnC 트위터/X 클론 프로젝트의 디자인 토큰과 시각적 가이드라인입니다.

## 디자인 원칙

1. **모바일 우선 (Mobile-First)**: 모바일 디바이스를 중심으로 설계하고, 데스크톱에서 확장
2. **간결성**: 깔끔하고 직관적인 인터페이스
3. **접근성**: 모든 사용자가 사용하기 쉬운 디자인
4. **일관성**: 전체 앱에서 일관된 디자인 언어
5. **반응형**: 다양한 화면 크기에 최적화

## 레이아웃

### 전체 레이아웃 구조

X(트위터)는 3단 레이아웃을 사용합니다:

```
┌─────────────────────────────────────────────────────────┐
│                    상단바 (Header)                      │
├──────────┬──────────────────────────┬───────────────────┤
│          │                          │                   │
│  좌측    │      메인 콘텐츠         │    우측           │
│ 사이드바 │      (피드 영역)         │   사이드바        │
│          │                          │                   │
│          │                          │                   │
└──────────┴──────────────────────────┴───────────────────┘
```

### 반응형 브레이크포인트 (Mobile-First)

프로젝트는 **모바일 우선** 접근 방식을 사용합니다. 기본 스타일은 모바일용이며, 미디어 쿼리를 통해 더 큰 화면에서 확장됩니다.

- **모바일**: < 640px (기본, 단일 컬럼, 하단 네비게이션)
- **태블릿**: 640px - 1024px (2단 레이아웃, 사이드바 표시)
- **데스크톱**: > 1024px (3단 레이아웃, 전체 사이드바)
- **대형 화면**: > 1280px (3단 레이아웃, 최대 너비 제한)

**모바일 레이아웃 특성:**
- 하단 고정 네비게이션 바 (Bottom Navigation)
- 전체 너비 컨텐츠
- 터치 친화적인 버튼 크기 (최소 44px × 44px)

### 사이드바 너비

- **좌측 사이드바**: 고정 너비 256px (데스크톱), 접을 수 있음
- **우측 사이드바**: 고정 너비 320px (데스크톱), 선택적 표시

### 메인 콘텐츠 영역

- **최대 너비**: 600px (트윗 읽기 최적 너비)
- **패딩**: 좌우 16px (모바일), 자동 중앙 정렬

## 색상 시스템

### 기본 색상 팔레트

프로젝트는 shadcn/ui Nova Preset의 색상 시스템을 사용합니다.

#### 라이트 모드

```css
--background: #FFFFFF (흰색)
--foreground: #0A0A0A (거의 검은색, 텍스트)
--primary: #1D9BF0 (X의 파란색, 주요 액션)
--secondary: #F7F7F7 (회색 배경)
--muted: #F7F7F7 (비활성 요소)
--accent: #F7F7F7 (강조 배경)
--border: #EBEBEB (경계선)
--destructive: #F4212E (경고/삭제, 빨간색)
```

#### 다크 모드

```css
--background: #000000 (검은색)
--foreground: #F7F7F7 (거의 흰색, 텍스트)
--primary: #1D9BF0 (X의 파란색, 주요 액션)
--secondary: #16181C (회색 배경)
--muted: #16181C (비활성 요소)
--accent: #16181C (강조 배경)
--border: #2F3336 (경계선)
--destructive: #F4212E (경고/삭제, 빨간색)
```

### 트위터 브랜드 컬러

- **Primary Blue**: `#1D9BF0` - 주요 CTA, 링크, 활성 상태
- **Primary Blue Hover**: `#1A8CD8` - 호버 상태
- **Heart Red**: `#F4212E` - 좋아요 버튼 (활성화 시)
- **Retweet Green**: `#00BA7C` - 리트윗 버튼 (활성화 시)

### 상태 색상

- **Success**: 초록색 계열 (성공 메시지)
- **Warning**: 노란색/주황색 계열 (경고 메시지)
- **Error**: 빨간색 계열 (에러 메시지)
- **Info**: 파란색 계열 (정보 메시지)

## 타이포그래피

### 폰트 패밀리

- **Primary Font**: Inter (Variable)
- **Fallback**: `ui-sans-serif, system-ui, sans-serif`

### 폰트 크기 및 줄간격

```css
/* 제목 (Headings) */
h1: 20px, font-weight: 700, line-height: 24px
h2: 17px, font-weight: 700, line-height: 20px
h3: 15px, font-weight: 700, line-height: 20px

/* 본문 (Body) */
body: 15px, font-weight: 400, line-height: 20px
small: 13px, font-weight: 400, line-height: 16px
tiny: 11px, font-weight: 400, line-height: 13px
```

### 텍스트 스타일

- **트윗 본문**: 15px, line-height: 20px
- **사용자 이름**: 15px, font-weight: 700
- **사용자 아이디**: 15px, color: muted (회색)
- **타임스탬프**: 13px, color: muted
- **버튼 텍스트**: 15px, font-weight: 700

## 간격 시스템

Tailwind CSS의 간격 시스템을 사용합니다 (4px 기준).

- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `5` = 20px
- `6` = 24px
- `8` = 32px
- `10` = 40px
- `12` = 48px

### 주요 간격 가이드

- **트윗 카드 간격**: 0px (경계선으로 구분)
- **트윗 내부 패딩**: 12px (상하), 16px (좌우)
- **버튼 패딩**: 8px - 16px (크기에 따라)
- **섹션 간격**: 16px - 24px

## 컴포넌트 스펙

### 트윗 카드

```
┌─────────────────────────────────────┐
│ [아바타] 사용자이름 @아이디 · 시간  │
│                                     │
│ 트윗 내용 텍스트...                 │
│ [이미지/미디어]                     │
│                                     │
│ [💬] [🔄] [❤️] [📤]                │
└─────────────────────────────────────┘
```

- **패딩**: 12px 16px
- **경계선**: 하단 1px border (모바일에서는 없을 수 있음)
- **호버 효과**: 배경색 약간 변경

### 버튼

#### Primary Button
- **배경색**: Primary Blue (#1D9BF0)
- **텍스트 색상**: 흰색
- **패딩**: 8px 16px
- **반경**: 24px (둥근 버튼)
- **폰트**: 15px, font-weight: 700

#### Secondary Button
- **배경색**: 투명
- **텍스트 색상**: Foreground
- **테두리**: 1px solid border
- **패딩**: 8px 16px
- **반경**: 24px

#### Icon Button
- **크기**: 36px × 36px
- **반경**: 50% (원형) 또는 4px
- **호버**: 배경색 변경

### 입력 필드

- **높이**: 52px
- **패딩**: 12px 16px
- **반경**: 4px
- **테두리**: 1px solid border
- **포커스**: 2px solid primary color outline

### 사이드바 네비게이션

- **메뉴 항목 높이**: 52px
- **패딩**: 12px 16px
- **아이콘 크기**: 24px
- **활성 상태**: 폰트 weight: 700, 색상: primary

### Toast 알림

Toast는 사용자 액션에 대한 피드백을 제공하는 비침투적 알림입니다.

- **위치**: 화면 하단 중앙 (모바일), 우측 상단 또는 하단 중앙 (데스크톱)
- **최대 너비**: 400px (모바일에서는 화면 너비 - 32px)
- **패딩**: 12px 16px
- **반경**: 8px
- **그림자**: 중간 그림자 (모달과 동일)
- **애니메이션**: 슬라이드 인/아웃 (200ms)
- **지속 시간**: 
  - 성공 메시지: 3초
  - 에러 메시지: 5초
  - 정보/경고 메시지: 4초

#### Toast 타입별 스타일

- **Success (성공)**: 
  - 배경색: Success 색상 (초록색 계열)
  - 텍스트 색상: 흰색
  - 아이콘: 체크 아이콘
  
- **Error (에러)**:
  - 배경색: Destructive 색상 (빨간색)
  - 텍스트 색상: 흰색
  - 아이콘: X 또는 경고 아이콘
  
- **Info (정보)**:
  - 배경색: Primary 색상 (파란색)
  - 텍스트 색상: 흰색
  - 아이콘: 정보 아이콘
  
- **Warning (경고)**:
  - 배경색: Warning 색상 (노란색/주황색 계열)
  - 텍스트 색상: 어두운 색
  - 아이콘: 경고 아이콘

## 아이콘

- **라이브러리**: Hugeicons
- **기본 크기**: 20px - 24px
- **작은 아이콘**: 16px - 18px
- **큰 아이콘**: 28px - 32px

### 주요 아이콘

- 홈: HomeIcon
- 탐색: SearchIcon
- 알림: NotificationIcon
- 메시지: MessageIcon
- 북마크: BookmarkIcon
- 프로필: UserIcon
- 좋아요: HeartIcon
- 리트윗: RepeatIcon
- 댓글: CommentIcon
- 공유: ShareIcon

## 그림자 (Shadows)

```css
/* 작은 그림자 (카드) */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

/* 중간 그림자 (모달) */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

/* 큰 그림자 (드롭다운) */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
```

## 애니메이션

### 전환 효과 (Transitions)

- **기본 duration**: 150ms - 200ms
- **easing**: ease-in-out 또는 ease-out

### 호버 효과

- **버튼 호버**: 배경색 변경 (150ms)
- **카드 호버**: 배경색 변경 (150ms)
- **아이콘 버튼 호버**: 배경색 변경, 스케일 1.1 (150ms)

### 로딩 애니메이션

- **스피너**: 회전 애니메이션 (linear, infinite)
- **스켈레톤**: 펄스 애니메이션 (페이드 인/아웃)

## 이미지 및 미디어

### 이미지 처리

- **비율**: 16:9 또는 원본 비율 유지
- **반경**: 12px - 16px
- **최대 높이**: 400px (원본 비율 유지)
- **로딩**: 지연 로딩 (lazy loading)

### 아바타

- **기본 크기**: 40px × 40px
- **큰 크기**: 48px × 48px
- **작은 크기**: 32px × 32px
- **형태**: 원형 (border-radius: 50%)

## 다크 모드

- **시스템 설정 따르기**: `prefers-color-scheme` 사용
- **수동 전환**: 설정에서 다크 모드 토글 가능
- **색상 대비**: WCAG AA 기준 준수 (최소 4.5:1)

## 접근성 (Accessibility)

- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **ARIA 레이블**: 아이콘 버튼에 설명 텍스트
- **포커스 표시**: 명확한 포커스 링 표시
- **색상 대비**: 텍스트와 배경의 충분한 대비
- **스크린 리더**: 의미 있는 HTML 구조 사용

## 구현 가이드

### Tailwind CSS 사용

프로젝트는 Tailwind CSS v4를 사용하므로, 위의 디자인 토큰은 Tailwind 클래스로 구현합니다.

예시:
```tsx
// 트윗 카드
<div className="p-3 px-4 border-b border-border hover:bg-accent transition-colors">
  {/* 트윗 내용 */}
</div>

// Primary 버튼
<button className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors">
  트윗하기
</button>
```

### shadcn/ui 컴포넌트 활용

기본 UI 컴포넌트는 shadcn/ui를 사용하며, 필요에 따라 커스터마이징합니다.

- Button
- Card
- Input
- Avatar
- Dialog
- Dropdown Menu
- Sonner (Toast 알림용, shadcn/ui를 통해 설치하는 Sonner 래퍼 컴포넌트)
- 기타 등등

## AI 여행 일지 모드 (AI Travel Log Mode)

여행 현장에서의 생생한 기록을 위해 설계된 전용 인터페이스입니다.

### 시각적 테마: "Night Vision Glass"
- **배경**: 풀스크린 카메라 뷰 (실시간 프리뷰)
- **컨트롤 패널**: 다크 글래스모피즘 (Glassmorphism) 효과 적용
  - `bg-background/60` + `backdrop-blur-xl`
  - 세련된 외곽선 (`border-white/10`)
- **포인트 컬러**: Deep Night Blue 전용 액센트 강조

### 주요 UI 요소 및 인터랙션

#### 1. 장소 플로팅 태그 (Location Tag)
- **위치**: 상단 중앙 또는 우측 상단
- **디자인**: 컴팩트한 칩 형태, 아이콘 + 장소명
- **효과**: 은은한 그림자와 반투명 배경

#### 2. 문체 선택 슬라이더 (Writing Style Chips)
- **옵션**: 감성적(Emotional), 정보 전달(Information), 위트(Witty)
- **애니메이션**: 선택 시 칩의 배경색이 Primary Blue로 부드럽게 전환
- **아이콘**: 각 문체의 특징을 나타내는 독창적인 아이콘 사용

#### 3. 음성 인식 컨트롤러 (Voice Controller)
- **메인 버튼**: 큼직한 원형 버튼, 중앙에 마이크 아이콘
- **비주얼라이저**: 녹음 중일 때 버튼 주변으로 파형 애니메이션(Waveform) 표시
- **피드백**: 버튼 주위의 글로우(Glow) 효과로 활성 상태 강조

#### 4. 생성 로딩 애니메이션 (Creation Loader)
- **컨셉**: "시각과 청각의 결합"
- **디자인**: 사진의 색감을 추출하여 퍼져나가는 입자 효과 또는 빛무리 애니메이션

### 구현 가이드
- **컴포넌트 구조**: `LogModeOverlay`가 전체 화면을 덮는 고정 위치(`fixed inset-0`)로 구현
- **반응형**: 모바일 세로 모드 최적화 (카메라 비율 준수)
- **애니메이션**: Framer Motion을 활용한 부드러운 패널 슬라이딩 및 버튼 스케일링 효과

---

## 참고 자료

- 실제 X(트위터) 웹사이트 참고
- shadcn/ui Nova Preset 문서
- Tailwind CSS 문서
- WCAG 접근성 가이드라인
- **AI 여행 일지 디자인 시안**: [ai_travel_log_overlay_mockup.png]

