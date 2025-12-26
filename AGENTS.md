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
- **Authentication**: Auth.js (session-based authentication)
- **Validation**: Zod (schema validation)
- **Date/Time**: Luxon (date and time handling)
- **Media Storage**: Cloudinary (for image and video uploads)
- **Mobile**: Capacitor (iOS, Android native apps, PWA support)

## Code Style & Conventions
- Use **TypeScript** for all files.
- Stick to functional components and React Hooks.
- Follow the shadcn/ui Nova design system for UI consistency.
- Use **Zod** for all schema validations and type-safe parsing.
- Use **Luxon** for date and time handling.
- For React Router v7 route functions (`meta`, `loader`, `action`), import types from `react-router` (e.g., `LoaderFunctionArgs`, `ActionFunctionArgs`, `MetaFunction`).
- Git commit messages must follow Conventional Commits in Korean (e.g., `feat(ui): 로그인 기능 추가`).

## Testing Instructions
- Currently, tests are being integrated as part of the development phase (Phase 9).
- Run available tests using: `npm test`

## Key Documentation
- `docs/implementation_plan.md`: The roadmap for project completion.
- `docs/UI_DESIGN_SYSTEM.md`: Design tokens and visual guidelines.
- `docs/DATABASE_SCHEMA.md`: Prisma schema and storage logic.
