# Quiz Generator

KI-gestützter Quiz-Generator für Lehrer — erstellt, verwaltet und veröffentlicht Multiple-Choice-Tests, die Schüler online absolvieren.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint

## Stack

Vite, React 19, TypeScript, Tailwind CSS 4, Supabase (Auth + DB), Vercel (Hosting + Serverless Functions)

## Architecture

- `src/` — React SPA (components, types, API client, Supabase client)
- `src/components/` — UI components (QuizInput, QuizReview, StudentView, TeacherDashboard, etc.)
- `api/` — Vercel Serverless Functions (quiz generation via Anthropic API)
- `supabase/` — Migrations and config

## Docs

- `docs/PRODUCT.md` — Product vision, features, user roles
- `docs/ARCHITECTURE.md` — System architecture and data flow
- `docs/REQUIREMENTS.md` — Functional and non-functional requirements
