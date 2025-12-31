# AGENTS.md

Welcome! your AI coding agent. This file follows the [AGENTS.md](https://agents.md/) standard to provide me with the context and instructions I need to work on the **STAYnC** project effectively.

## Project Overview
STAYnC is a Twitter/X clone project built with React Router v7, Turso (libSQL), and modern web technologies. The goal is to recreate the core functionality and user experience of Twitter/X, featuring a modern UI with Tailwind v4 and shadcn/ui components. The project is **mobile-first**, optimized for mobile devices while maintaining full desktop support, using Capacitor for native mobile app deployment.

## Setup Commands
- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Build production bundle: `npm run build`
- Database migration: `npx prisma migrate dev`
- Database studio: `npx prisma studio`

## Tech Stack
- **Framework**: React Router v7 (Vite)
- **Styling**: Tailwind CSS v4, shadcn/ui (Nova Preset)
- **Database**: Turso (libSQL) with Prisma ORM
- **Authentication**: Better Auth (session-based authentication)
- **Validation**: Zod (schema validation)
- **Date/Time**: Luxon (date and time handling)
- **Media Storage**: Cloudinary (for image and video uploads)
- **Mobile**: Capacitor (iOS, Android native apps, PWA support)
- **Search (Optional)**: RAG system with Vector DB (Pinecone, Weaviate, or FAISS) and Embedding models (OpenAI or open-source)
- **Maps (Travel Blog)**: Google Maps API, Naver Maps API, or Mapbox (for location visualization and travel route mapping)

## Code Style & Conventions
- Use **TypeScript** for all files.
- Stick to functional components and React Hooks.
- Follow the shadcn/ui Nova design system for UI consistency.
- Use **Zod** for all schema validations and type-safe parsing.
- Use **Luxon** for date and time handling.
- For React Router v7 route functions (`meta`, `loader`, `action`), import types from `react-router` (e.g., `LoaderFunctionArgs`, `ActionFunctionArgs`, `MetaFunction`).
- Use **Toast notifications** (Sonner - shadcn/ui를 통해 설치하는 Toast 컴포넌트) for user feedback on important actions:
  - Success: Login, logout, signup, tweet creation/update/delete, comment creation, etc.
  - Error: Failed actions, validation errors, etc.
  - Info: General information messages
  - Warning: Cautionary messages
- **Error Handling**: Always implement comprehensive error handling:
  - Check for `error` field in all fetcher responses (`fetcher.data?.error`)
  - Display errors using `toast.error()` instead of showing raw error messages on the UI
  - Remove optimistic updates when errors occur (e.g., remove optimistic messages on send failure)
  - Handle API errors gracefully in all `useEffect` hooks that process fetcher data
  - Never leave error handling as an afterthought - it must be included from the initial implementation
- Git commit messages must follow Conventional Commits in Korean (e.g., `feat(ui): 로그인 기능 추가`).

## Side-Effect Isolation
When modifying shared components or logic, you MUST analyze the 'Impact Scope' first. Ensure that changes intended for a specific use case (e.g., AI features) do not inadvertently affect general functionality (e.g., normal chat). You MUST strictly isolate such logic using conditional checks or specific guards.

## Workflow & Safety
- **[Safe Checkpoint Strategy]** 새로운 작업이나 중요한 변경(새 파일 생성, DB 스키마 수정, 패키지 설치 등)을 시작하기 전에, 반드시 현재 상태를 git commit하거나 작업 디렉토리가 깨끗한지 확인을 요청해야 합니다.

## Communication Rules
- **[No Emojis]** 사용자와의 모든 채팅 대화에서 이모지(Emoji) 및 이모티콘(Emoticon) 사용을 전면 금지합니다. 텍스트와 코드만으로 명확하게 정보를 전달하십시오.

## Testing Instructions
- Currently, tests are being integrated as part of the development phase (Phase 9).
- Run available tests using: `npm test`

## Key Documentation
- `docs/01_IMPLEMENTATION_PLAN.md`: The roadmap for project completion.
- `docs/03_UI_DESIGN_SYSTEM.md`: Design tokens and visual guidelines.
- `docs/02_DATABASE_SCHEMA.md`: Prisma schema and storage logic.
