# AI 포스팅 개선 구현 가이드

> **작성일시:** 2026년 2월 7일
> **프로젝트:** AI-Tweeter (STAYnC Blog)
> **문서번호:** 13_AI_POSTING_IMPROVEMENTS_IMPLEMENTATION
> **참조:** 12_AI_POSTING_IMPROVEMENTS.md (문제 정의 및 개선 방향)

---

## 1. 개요

본 문서는 **12_AI_POSTING_IMPROVEMENTS.md**에서 정의한 개선안을 실제 코드로 구현하기 위한 단계별 가이드이다. 대상 파일은 `app/components/ai/log-mode-overlay.tsx`이며, 백엔드 API(`api.ai-travel-log.ts`, `api.tweets.ts`)는 변경하지 않는다.

### 1.1 구현 전 준수 사항

- **[Safe Checkpoint]** 작업 시작 전 현재 상태를 git commit 하거나 작업 디렉토리가 깨끗한지 확인한다.
- **[Side-Effect Isolation]** 변경은 AI 로그 모드 오버레이에만 적용되며, 일반 트윗 작성/채팅 등 다른 기능에는 영향을 주지 않도록 조건 분기로 격리한다.

### 1.2 구현 우선순위

| 순위 | 항목 | 문서 섹션 |
|------|------|-----------|
| 1 | Landscape 모드 레이아웃 개선 | 3 |
| 2 | "직접 쓰기" 모드 추가 | 4 |
| 3 | 결과 화면 "AI로 다듬기" 버튼 (직접 쓰기 모드 전용) | 5 |
| 4 | 녹음 중 UI 자동 최소화 (선택) | 6 |

---

## 2. 영향 범위 및 수정 파일

| 파일 | 변경 유형 |
|------|----------|
| `app/components/ai/log-mode-overlay.tsx` | 타입 확장, 레이아웃 분기, 스타일 선택 UI, 녹음/결과 로직, 결과 오버레이 UI |
| `app/app.css` | (선택) Landscape용 커스텀 유틸리티 추가 시 |

- `app/routes/travel/api.ai-travel-log.ts`: 변경 없음 (dictation 모드에서는 호출하지 않음)
- `app/routes/tweets/api.tweets.ts`: 변경 없음

---

## 3. Phase 1: Landscape 모드 레이아웃 개선

### 3.1 목표

모바일 가로(Landscape) 모드에서 하단 UI가 카메라 화면을 과도하게 가리지 않도록, 컨트롤을 우측 세로 배치하는 전용 레이아웃을 적용한다.

### 3.2 방안 요약

- **세로(Portrait):** 기존 하단 패널 유지, 패딩/그라데이션만 약간 컴팩트화.
- **가로(Landscape):** 컨트롤을 화면 우측에 세로로 배치하여 카메라 영역 최대 확보.

### 3.3 Orientation 감지

**위치:** 컴포넌트 상단 (상태 선언 부근)

- `useState`로 `isLandscape` 추가.
- `useEffect` 내에서 `window.matchMedia("(orientation: landscape)")` 로 미디어 쿼리 구독, 변경 시 `setIsLandscape(matches)`.
- 초기값은 `typeof window !== "undefined" ? window.matchMedia("(orientation: landscape)").matches : false` 로 설정 가능.

```typescript
const [isLandscape, setIsLandscape] = useState(false);

useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    setIsLandscape(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
}, []);
```

### 3.4 최상위 컨테이너 (Line 253 근처)

- **현재:** `flex flex-col` 고정.
- **변경:** Landscape일 때는 `flex-row` 로 전환하여 좌측 카메라 영역 + 우측 컨트롤 영역 분리.

```tsx
<div className={cn(
    "fixed inset-0 z-100 bg-black overflow-hidden flex animate-in fade-in duration-300",
    isLandscape ? "flex-row" : "flex-col"
)}>
```

### 3.5 카메라 프리뷰 영역 (Line 255~268)

- **현재:** `absolute inset-0`.
- **변경:** Landscape일 때는 `flex-1` 또는 `flex-1 min-w-0` 으로 좌측에 배치되도록 감싸는 wrapper 사용. 기존 `absolute inset-0` 는 Portrait에서만 유지하고, Landscape에서는 wrapper가 flex로 공간 차지하도록 구성.

예시 구조:

```tsx
<div className={cn("relative z-0", isLandscape ? "flex-1 min-w-0" : "absolute inset-0")}>
    {/* 기존 video / placeholder */}
</div>
```

### 3.6 그라데이션 오버레이 (Line 469)

- **현재:** `h-1/2 bg-linear-to-t from-black/80 to-transparent`.
- **변경:**
  - Portrait: `h-1/2` 유지 또는 `h-2/5` 로 약간 축소.
  - Landscape: `h-1/4` 또는 우측 컨트롤 영역에만 작은 그라데이션 적용 (`right-0 top-0 bottom-0 w-24 bg-linear-to-l from-black/60 to-transparent`).

```tsx
<div className={cn(
    "absolute pointer-events-none",
    isLandscape
        ? "right-0 top-0 bottom-0 w-24 bg-linear-to-l from-black/60 to-transparent"
        : "bottom-0 left-0 right-0 h-1/2 bg-linear-to-t from-black/80 to-transparent"
)} />
```

### 3.7 하단 패널 전체 (Line 286~411)

- **현재:** `mt-auto ... p-6 pb-12 ... gap-8` 로 하단에 세로 배치.
- **변경:**
  - Portrait: 기존과 유사하게 유지, `pb-12` 를 `pb-8 landscape:pb-4` 등으로 조정 가능.
  - Landscape: 이 블록을 우측 세로 패널로 변경.
    - 컨테이너: `flex flex-col justify-center items-center gap-4 p-4 min-w-[140px]` 정도로 우측 고정.
    - 스타일 선택: 3열 2행 그리드 대신 **1열 4행** (또는 5행, 직접 쓰기 추가 시) 세로 배치.
    - 녹음/분석 버튼: `w-24 h-24` 대신 `w-16 h-16` (64px).
    - 펄스 애니메이션: `120px`/`160px` 대신 `80px`/`100px`.
    - 안내 텍스트("눌러서 감상을 말해보세요"): Landscape일 때 `hidden`.

### 3.8 스타일 선택기 그리드 (Line 289)

- **현재:** `grid grid-cols-3 gap-3`.
- **변경:** `isLandscape ? "grid grid-cols-1 gap-2" : "grid grid-cols-3 gap-3"`.
- 버튼 패딩: Landscape일 때 `py-2` 등으로 축소.

### 3.9 녹음/분석 버튼 영역 (Line 348~401)

- 버튼 크기: `isLandscape ? "w-16 h-16" : "w-24 h-24"`.
- 펄스 원: `isLandscape` 일 때 `w-[80px] h-[80px]`, `w-[100px] h-[100px]` 등으로 축소.
- 안내 문구 wrapper: `!isLandscape && (...)` 또는 `className` 에 `hidden landscape:hidden` 등으로 Landscape에서 숨김.

### 3.10 상단 바 (Line 272)

- **현재:** `pt-12 md:pt-6`.
- **변경:** Landscape일 때 패딩 축소. 예: `pt-12 md:pt-6 landscape:pt-4` (Tailwind에 `landscape:` variant가 있다면). 없으면 `isLandscape ? "pt-4" : "pt-12 md:pt-6"` 로 조건부 클래스 적용.

### 3.11 Tailwind landscape variant

- Tailwind v4에서 `landscape:` 가 내장되어 있지 않다면, `@custom-media` 또는 `app.css` 에서 미디어 쿼리 `(orientation: landscape)` 를 활용한 유틸 클래스를 정의하거나, 위와 같이 JS `isLandscape` 상태로 조건부 클래스를 주는 방식으로 구현한다.

---

## 4. Phase 2: "직접 쓰기" 모드 추가

### 4.1 목표

음성으로 말한 내용을 AI가 재작성하지 않고 그대로 트윗 본문으로 사용할 수 있는 "직접 쓰기"(dictation) 모드를 추가한다.

### 4.2 타입 확장 (Line 25)

**현재:**

```typescript
type WritingStyle = "emotional" | "information" | "witty" | "auto";
```

**변경:**

```typescript
type WritingStyle = "emotional" | "information" | "witty" | "auto" | "dictation";
```

### 4.3 스타일 선택 UI (Line 288~338)

- 스타일 선택 그리드에 다섯 번째 버튼 **"직접 쓰기"** 추가.
- 아이콘: `@hugeicons/core-free-icons` 에서 텍스트/메모 계열 아이콘 선택 (예: `Edit02Icon`, `TextIcon` 등 프로젝트에서 사용 중인 것과 통일).
- `onClick`: `setSelectedStyle("dictation")`.
- 선택 시 스타일: 기존과 동일하게 `selectedStyle === "dictation"` 일 때 primary 배경 등.

**그리드:** 3열 2행인 경우 "직접 쓰기"를 두 번째 행 한가운데 또는 새 행에 배치. Landscape에서는 1열 5행으로 확장.

### 4.4 녹음 중지 시 동작 분기 (Line 136~154, handleToggleRecording)

**현재:** 녹음 중지 후 `setTimeout(() => generateLog(), 500)` 으로 무조건 AI 생성 호출.

**변경:**

- `selectedStyle === "dictation"` 인 경우:
  - `generateLog()` 를 호출하지 않음.
  - 500ms 후에 **사진만 캡처**하고, 캡처한 이미지와 `transcribedText` 를 그대로 `setGeneratedResult({ content: transcribedText.trim() || "(음성 내용 없음)", image: imageData })` 로 설정.
- 사진 캡처 로직은 `generateLog` 내부와 동일하게 canvas에서 추출하므로, **캡처만 수행하는 헬퍼 함수** (예: `captureFrame()`)를 만들어 두고:
  - dictation 모드: `captureFrame()` → `setGeneratedResult({ content: transcribedText.trim() || "...", image: dataUrl })`.
  - 그 외 모드: 기존처럼 `generateLog()` 호출.

구현 시 `generateLog` 에서 사용하는 캡처 코드를 `captureFrame(): Promise<string>` 형태로 분리하고, `handleToggleRecording` 에서:

```typescript
if (selectedStyle === "dictation") {
    setTimeout(async () => {
        const imageData = await captureFrame();
        if (imageData) {
            setGeneratedResult({
                content: transcribedText.trim() || "음성 내용을 입력해 주세요.",
                image: imageData
            });
        }
    }, 500);
    return;
}
// 기존: setTimeout(() => generateLog(), 500);
```

### 4.5 generateLog 내부 (Line 161~208)

- **진입 시:** `selectedStyle === "dictation"` 이면 이 API는 호출하지 않도록 상위에서 이미 분기했으므로, 내부에서는 불필요 시 early return 만 추가해도 됨 (선택).
- **API 호출 시:** `style` 에 `dictation` 이 전달되지 않도록 상위에서 막았으므로, 서버는 수정하지 않아도 됨.

### 4.6 스마트 분석 / 직접 쓰기 모드에 따른 버튼 표시 (Line 357~402)

- **현재:** `selectedStyle === "auto"` 일 때 "분석 및 생성" 버튼, 그 외에는 마이크 버튼.
- **변경:** `selectedStyle === "dictation"` 일 때도 **마이크 버튼** 표시 (음성 입력 후 녹음 중지 시 직접 쓰기 결과로 이동). 즉, "직접 쓰기"는 음성 입력을 받는 모드이므로 auto와 다르게 마이크 버튼을 사용한다.

---

## 5. Phase 3: 결과 화면 "AI로 다듬기" 버튼 (직접 쓰기 전용)

### 5.1 목표

"직접 쓰기" 모드로 결과 화면에 왔을 때, 사용자가 원하면 그때 AI로 다듬기를 요청할 수 있도록 한다.

### 5.2 상태 추가

- 결과가 "직접 쓰기"로 생성되었는지 구분할 수 있도록 상태가 필요하다.
- 예: `generatedByDictation: boolean` 상태를 추가하고, `setGeneratedResult` 호출 시 함께 설정.
  - dictation 경로에서 결과를 넣을 때: `setGeneratedByDictation(true)`.
  - `generateLog()` (AI 호출) 결과를 넣을 때: `setGeneratedByDictation(false)`.
  - "다시 하기" 시: `setGeneratedByDictation(false)`.

### 5.3 결과 오버레이 UI (Line 405~466)

- `generatedByDictation === true` 일 때만 **"AI로 다듬기"** 버튼을 표시한다.
- 배치: "다시 하기" / "확인 및 게시" 위나 옆에 세 번째 버튼으로 추가하거나, 2열 그리드에서 "다시 하기" 옆에 배치.
- 클릭 시:
  - 현재 `generatedResult.content` 와 `generatedResult.image` 를 사용하여 `POST /api/ai-travel-log` 호출 (style은 예: `"emotional"` 또는 사용자가 선택한 스타일 유지용 상태가 있다면 그대로 사용).
  - 성공 시 `setGeneratedResult({ content: result.content, image: generatedResult.image })`, `setGeneratedByDictation(false)`.
  - 실패 시 `toast.error` 등 처리.

스타일 선택은 결과 화면에서는 보이지 않으므로, "AI로 다듬기" 시 기본 스타일(예: `emotional`) 또는 이전에 선택했던 `selectedStyle`(dictation 제외)을 사용하면 된다. 문서상으로는 "기본 스타일로 다듬기"로 두고, 필요 시 나중에 결과 화면에서 스타일을 선택하는 UI를 확장할 수 있다.

---

## 6. Phase 4 (선택): 녹음 중 UI 자동 최소화

### 6.1 목표

녹음이 시작되면 스타일 선택기 등을 숨겨 카메라 영역을 더 넓게 보여 준다.

### 6.2 구현

- `isRecording === true` 일 때:
  - 스타일 선택 그리드를 `hidden` 또는 높이 0 + overflow hidden 으로 숨김.
  - 안내 텍스트만 남기거나, 마이크 버튼만 노출.
- 세로/가로 모드 모두 동일하게 적용 가능.

---

## 7. 구현 순서 권장

1. **Phase 2 (직접 쓰기 모드)**  
   타입 추가, 스타일 버튼, `captureFrame` 분리, `handleToggleRecording` / 결과 설정 분기. API 호출 없이 결과만 채우는 흐름을 먼저 완성하고 동작 확인.

2. **Phase 3 (AI로 다듬기 버튼)**  
   `generatedByDictation` 상태와 결과 화면 버튼, API 호출 로직 추가.

3. **Phase 1 (Landscape 레이아웃)**  
   `isLandscape` 상태, 레이아웃 분기, 그라데이션/패널/버튼 크기 조정. 실제 기기 또는 DevTools에서 가로 모드로 확인.

4. **Phase 4 (녹음 중 최소화)**  
   필요 시 마지막에 적용.

---

## 8. 검증 체크리스트

- [ ] Portrait에서 기존처럼 AI 스타일 선택 후 음성 → 분석 → 결과 → 게시 흐름이 그대로 동작하는가?
- [ ] "직접 쓰기" 선택 후 음성 입력 → 녹음 중지 시 AI 호출 없이 STT 텍스트 + 캡처 이미지가 결과 화면에 나타나는가?
- [ ] 결과 화면에서 "AI로 다듬기" 버튼은 직접 쓰기로 들어왔을 때만 보이는가? 클릭 시 API 호출 후 문구가 AI 생성 문구로 바뀌는가?
- [ ] 모바일 또는 브라우저 가로 모드에서 컨트롤이 우측에 세로로 배치되고, 카메라 영역이 넓게 보이는가?
- [ ] 가로 모드에서도 "직접 쓰기" 포함 5개 스타일이 모두 선택 가능하고, 녹음/분석/게시가 정상 동작하는가?
- [ ] "다시 하기" 후 스타일 선택, 음성, 결과 상태가 초기화되는가?

---

## 9. 참고: captureFrame 헬퍼 제안

`generateLog` 내부의 캡처 로직을 공통 함수로 추출할 때 예시는 다음과 같다.

```typescript
function captureFrame(video: HTMLVideoElement): string | null {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
}
```

- `handleToggleRecording` 의 dictation 분기에서는 `videoRef.current` 와 `stream` 이 있을 때만 `captureFrame(videoRef.current)` 를 호출하고, 반환된 data URL을 `setGeneratedResult` 에 사용한다.
- `generateLog` 는 동일하게 첫 부분에서 `captureFrame(videoRef.current)` 를 사용한 뒤, 그 결과를 FormData에 넣고 API를 호출하도록 리팩터링하면 중복이 제거된다.

이 가이드를 따라 구현하면 12번 문서의 개선안을 코드 수준에서 적용할 수 있다.
