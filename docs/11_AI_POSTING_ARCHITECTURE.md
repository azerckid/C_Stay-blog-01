# AI 포스팅 기능 아키텍처 문서

> **작성일시:** 2026년 2월 7일 (금) 오전 02:44 KST
> **프로젝트:** AI-Tweeter (STAYnC Blog)
> **문서번호:** 11_AI_POSTING_ARCHITECTURE

---

## 1. 개요

본 문서는 AI-Tweeter 프로젝트의 핵심 기능인 **AI 기반 여행 포스팅 시스템**의 기술 구조를 설명한다. 이 기능은 사용자가 카메라로 사진을 촬영하고 음성으로 설명을 입력하면, AI가 이를 분석하여 자동으로 여행 게시글을 생성하는 멀티모달 시스템이다.

### 1.1 핵심 흐름 요약

```
카메라 촬영 + 음성 입력 → AI 분석 (Gemini 2.5 Flash) → 트윗 자동 생성 → 게시
```

---

## 2. 전체 흐름도

```
┌──────────────────────────────────────────────────────┐
│  사용자가 AI 버튼 클릭 (사이드바 or 플로팅 버튼)         │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  LogModeOverlay 풀스크린 오버레이 열림                   │
│  - 후면 카메라 활성화                                   │
│  - 마이크 권한 요청                                     │
│  - GPS 위치 자동 감지 (Geocoding)                       │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  글쓰기 스타일 선택                                     │
│  - 감성적 / 정보 전달 / 위트·발랄 / 스마트 분석           │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  마이크 버튼 클릭 → 음성 인식 시작 (STT)                 │
│  - 실시간 텍스트 변환 표시                               │
│  - 다시 클릭하면 인식 중지                               │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  분석 버튼 클릭                                        │
│  - 현재 카메라 프레임을 Canvas로 캡처                    │
│  - Base64 JPEG로 변환                                  │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  POST /api/ai-travel-log                              │
│  - Gemini 2.5 Flash에 사진 + 음성 텍스트 전달           │
│  - 스타일에 맞는 프롬프트 구성                           │
│  - ~100자 한국어 여행기 생성                             │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  결과 확인 및 수정 화면                                  │
│  - AI 생성 텍스트 표시                                  │
│  - 인라인 편집 가능                                     │
│  - "다시 하기" or "확인 및 게시"                         │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  POST /api/tweets                                     │
│  1. Base64 이미지 → Cloudinary 업로드                   │
│  2. DB 트랜잭션 (트윗 + 미디어 + 태그 저장)              │
│  3. AI 임베딩 생성 (시맨틱 검색용)                       │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│  게시 완료                                             │
│  - 토스트 알림: "여행기가 피드에 게시되었습니다!"           │
│  - 홈 피드로 이동                                       │
└──────────────────────────────────────────────────────┘
```

---

## 3. 핵심 파일 구조

| 파일 | 역할 |
|------|------|
| `app/components/ai/log-mode-overlay.tsx` | 핵심 UI - 카메라, 음성인식, 편집, 게시 전체 흐름 |
| `app/routes/travel/api.ai-travel-log.ts` | AI 처리 - Gemini에 사진+텍스트 전달, 글 생성 |
| `app/routes/tweets/api.tweets.ts` | 트윗 저장 - Cloudinary 업로드, DB 저장, 임베딩 생성 |
| `app/lib/cloudinary.server.ts` | 이미지 저장소 - Cloudinary 업로드/삭제 |
| `app/lib/gemini.server.ts` | AI 엔진 - 임베딩 생성 유틸리티 |
| `app/components/layout/main-layout.tsx` | 레이아웃 - AI 모드 진입 버튼 |

---

## 4. 상세 구현

### 4.1 진입점 - AI 모드 열기

**파일:** `app/components/layout/main-layout.tsx`

사용자는 두 가지 경로로 AI 포스팅 기능에 접근할 수 있다:

- **사이드바:** "AI 여행 일지" 메뉴 항목 클릭
- **플로팅 버튼:** 화면 우하단의 AI 아이콘 버튼 클릭

두 경우 모두 `isAiLogOpen` 상태를 `true`로 설정하여 `LogModeOverlay` 컴포넌트를 풀스크린으로 렌더링한다.

---

### 4.2 카메라 활성화 및 사진 캡처

**파일:** `app/components/ai/log-mode-overlay.tsx` (Lines 71~128, 163~210)

#### 4.2.1 카메라 초기화

```typescript
navigator.mediaDevices.getUserMedia({
    video: {
        facingMode: "environment",    // 후면 카메라 사용
        width: { ideal: 1280 },
        height: { ideal: 720 }
    },
    audio: true                       // 오디오도 동시 요청
})
```

- 후면 카메라(`facingMode: "environment"`)를 기본으로 사용
- 비디오와 오디오 스트림을 동시에 요청
- 오디오 권한 획득 실패 시 비디오만으로 fallback 처리
- 획득한 스트림은 `<video>` 요소에 실시간 표시

#### 4.2.2 사진 캡처

분석 버튼 클릭 시 현재 비디오 프레임을 이미지로 변환한다:

```typescript
// 1. Canvas 생성 (비디오와 동일한 크기)
const canvas = document.createElement("canvas");
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

// 2. 현재 비디오 프레임을 Canvas에 그리기
const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0);

// 3. Base64 JPEG로 변환 (품질 80%)
const imageData = canvas.toDataURL("image/jpeg", 0.8);
```

#### 4.2.3 위치 감지

카메라 활성화와 동시에 Geolocation API로 현재 위치를 감지한다:

- `navigator.geolocation.getCurrentPosition()`으로 GPS 좌표 획득
- Google Maps Geocoding API로 좌표를 주소명으로 변환
- 위치명은 UI에 표시되며, 트윗 게시 시 함께 저장됨

---

### 4.3 음성 인식 (Speech-to-Text)

**파일:** `app/components/ai/log-mode-overlay.tsx` (Lines 39~69)

#### 4.3.1 초기화

```typescript
const SpeechRecognition =
    (window as any).webkitSpeechRecognition ||
    (window as any).speechRecognition;

const recognizer = new SpeechRecognition();
recognizer.lang = "ko-KR";           // 한국어 인식
recognizer.continuous = true;         // 연속 인식 모드
recognizer.interimResults = true;     // 중간 결과 표시
```

- 브라우저 내장 Web Speech API 사용 (별도 서버 불필요)
- 한국어(`ko-KR`)로 설정
- `continuous: true`로 여러 문장을 연속 인식
- `interimResults: true`로 말하는 도중에도 실시간으로 텍스트 표시

#### 4.3.2 동작 흐름

1. 마이크 버튼(흰색) 클릭 → 음성 인식 시작, 버튼이 빨간색으로 변경
2. 사용자가 한국어로 말하면 화면에 실시간 텍스트 표시
3. `onresult` 이벤트 핸들러에서 중간 결과(interim)와 최종 결과(final)를 구분 처리
4. 최종 결과는 `transcribedText` 상태에 누적 저장
5. 마이크 버튼을 다시 클릭하면 인식 중지
6. 500ms 딜레이를 두어 마지막 결과까지 처리

#### 4.3.3 이벤트 처리

```typescript
recognizer.onresult = (event) => {
    // 최종 결과(final)는 transcribedText에 누적
    // 중간 결과(interim)는 화면에만 표시
};

recognizer.onerror = (event) => {
    // 인식 에러 발생 시 녹음 중지
};
```

---

### 4.4 글쓰기 스타일 선택

**파일:** `app/components/ai/log-mode-overlay.tsx` (Lines 288~338)

사용자는 4가지 글쓰기 스타일 중 하나를 선택할 수 있다:

| 스타일 | 키값 | 설명 |
|--------|------|------|
| 감성적 | `emotional` | 따뜻하고 감성적인 분위기, 풍부한 감각 표현 |
| 정보 전달 | `information` | 장소의 특징과 실용적인 여행 정보 중심 |
| 위트/발랄 | `witty` | 재치 있고 유머러스한 톤, 밝은 분위기 |
| 스마트 분석 | `auto` | AI가 사진을 분석하여 가장 적합한 톤을 자동 결정 |

선택된 스타일은 `selectedStyle` 상태에 저장되어 AI 프롬프트 구성 시 사용된다.

---

### 4.5 AI 처리 - Gemini 2.5 Flash

**파일:** `app/routes/travel/api.ai-travel-log.ts`

#### 4.5.1 API 엔드포인트

```
POST /api/ai-travel-log
```

**요청 파라미터 (FormData):**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `image` | string | Base64 인코딩 JPEG 이미지 |
| `voiceText` | string | 음성 인식된 텍스트 (자동 모드에선 빈 문자열) |
| `style` | string | 글쓰기 스타일 (`emotional`, `information`, `witty`, `auto`) |
| `location` | string | Geocoding으로 얻은 위치명 |

#### 4.5.2 프롬프트 구성

**두 가지 모드:**

| 모드 | 조건 | 프롬프트 전략 |
|------|------|--------------|
| 음성 모드 | `voiceText`가 존재할 때 | 사용자의 말을 주요 내용으로, 사진은 보조 참고 |
| 자동 모드 | `voiceText`가 비었을 때 | 사진 분석이 주요, 위치는 참고 정보 |

**스타일별 지시문:**

```
감성적:  "따뜻하고 감성적인 분위기로, 풍부한 표현을 사용하여 100자 내외로 작성해줘"
정보:    "장소의 특징과 유용한 정보를 포함하여 100자 내외로 명확하게 작성해줘"
위트:    "재치 있고 유머러스한 시선으로 100자 내외로 즐겁게 작성해줘"
자동:    "사진 속 인물들의 표정, 구성, 배경을 스스로 분석하여 가장 잘 어울리는 감상을 100자 내외로"
```

#### 4.5.3 AI 호출

```typescript
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const response = await model.generateContent([promptText, imageData]);
const resultText = response.response.text();
```

Gemini 2.5 Flash 모델에 **텍스트 프롬프트 + 이미지**를 동시에 전달하는 멀티모달 방식으로 호출한다.

#### 4.5.4 응답 형식

```json
{
    "success": true,
    "content": "생성된 여행기 텍스트 (~100자)",
    "image": "base64 인코딩 이미지"
}
```

---

### 4.6 결과 확인 및 수정

**파일:** `app/components/ai/log-mode-overlay.tsx` (Lines 405~466)

AI가 생성한 결과를 사용자가 확인하고 수정할 수 있는 화면:

- AI 생성 텍스트가 캡처된 사진 위에 오버레이로 표시
- 텍스트 영역을 클릭하면 `<textarea>`로 전환되어 인라인 편집 가능
- 텍스트 영역 바깥을 클릭하면 편집 모드 종료
- **"다시 하기"** 버튼: 결과를 폐기하고 카메라 모드로 복귀
- **"확인 및 게시"** 버튼: 트윗으로 게시 진행

---

### 4.7 트윗 게시

**파일:** `app/components/ai/log-mode-overlay.tsx` (Lines 212~248)

#### 4.7.1 클라이언트 → 서버 전송

```typescript
const formData = new FormData();
formData.append("content", generatedResult.content);       // AI 생성 텍스트
formData.append("aiImage", generatedResult.image);          // Base64 JPEG
formData.append("location", JSON.stringify({
    name: currentLocation.name,
    latitude: currentLocation.lat,
    longitude: currentLocation.lng
}));
formData.append("travelDate", new Date().toISOString());    // 현재 날짜

fetch("/api/tweets", { method: "POST", body: formData });
```

---

### 4.8 백엔드 트윗 저장

**파일:** `app/routes/tweets/api.tweets.ts` (Lines 151~387)

`POST /api/tweets` 엔드포인트에서 3단계로 처리된다:

#### 4.8.1 단계 1: Cloudinary 이미지 업로드

```typescript
if (aiImage && aiImage.startsWith("data:image")) {
    const base64Data = aiImage.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const uploadResult = await uploadToCloudinary(buffer, `ai-log-${Date.now()}`);

    mediaData.push({
        url: uploadResult.url,
        type: "IMAGE",
        publicId: uploadResult.publicId,
        order: 0
    });
}
```

- Base64 문자열에서 순수 데이터 부분만 추출
- Buffer로 변환 후 Cloudinary에 서버사이드 업로드
- 반환된 URL과 publicId를 미디어 데이터에 추가

#### 4.8.2 단계 2: DB 트랜잭션

하나의 트랜잭션 내에서 다음을 수행:

1. **tweets 테이블**: 본문, userId, visibility, locationName, latitude, longitude, city, country, address, travelDate 저장
2. **media 테이블**: Cloudinary URL과 트윗 ID 연결
3. **travelTags / tweetTravelTags 테이블**: 여행 태그가 있을 경우 태그 생성 및 연결

#### 4.8.3 단계 3: AI 임베딩 생성

```typescript
const embeddingText = `${tweet.content} ${tweet.tags.map(t => t.travelTag.name).join(" ")}`;
const vector = await generateEmbedding(embeddingText);
// tweetEmbeddings 테이블에 768차원 벡터 저장
```

- Gemini `text-embedding-004` 모델을 사용
- 트윗 본문 + 태그를 결합한 텍스트로 768차원 벡터 생성
- `tweetEmbeddings` 테이블에 저장하여 시맨틱 검색에 활용

---

## 5. 사용 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| 음성 인식 | Web Speech API (`webkitSpeechRecognition`) | 브라우저 내장 STT, 별도 서버 불필요 |
| 사진 캡처 | Canvas API (`drawImage` + `toDataURL`) | 비디오 프레임을 JPEG 이미지로 변환 |
| 위치 감지 | Geolocation API + Google Maps Geocoding | GPS 좌표 획득 및 주소명 변환 |
| AI 분석 | Google Gemini 2.5 Flash | 멀티모달(이미지+텍스트) 분석 및 글 생성 |
| 이미지 저장 | Cloudinary | Base64 → 서버사이드 업로드, CDN 배포 |
| 시맨틱 검색 | Gemini text-embedding-004 | 768차원 벡터 임베딩 생성 |
| DB | Turso (libSQL) + Drizzle ORM | 트윗, 미디어, 태그, 임베딩 저장 |
| 프레임워크 | React Router v7 (Vite SSR) | 서버/클라이언트 렌더링 |

---

## 6. 환경 변수

이 기능이 동작하기 위해 필요한 환경 변수:

| 변수명 | 용도 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini AI API 인증 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary 클라우드 식별자 |
| `CLOUDINARY_API_KEY` | Cloudinary API 인증 키 |
| `CLOUDINARY_API_SECRET` | Cloudinary 서명용 시크릿 |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps Geocoding API |

---

## 7. 기능 특장점

1. **멀티모달 입력**: 사진 + 음성을 결합한 자연스러운 여행 기록 경험
2. **4가지 글쓰기 스타일**: 사용자 취향에 맞는 다양한 톤 선택 가능
3. **실시간 STT**: 말하는 도중에도 텍스트가 화면에 표시되는 즉각적 피드백
4. **자동 위치 태깅**: GPS + Geocoding으로 위치 정보 자동 수집
5. **편집 가능한 결과**: AI 결과를 사용자가 직접 수정 후 게시 가능
6. **시맨틱 검색 지원**: 임베딩 기반으로 유사한 여행기를 지능적으로 검색
7. **서버리스 음성 인식**: 브라우저 내장 API 활용으로 별도 STT 서버 불필요
8. **모바일 최적화**: 후면 카메라 우선 사용, 터치 인터페이스 지원
