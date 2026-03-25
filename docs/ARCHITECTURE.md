# Architecture

## Overview
React SPA (Vite) mit Supabase als Backend (Auth, Postgres, Row Level Security). Vercel hostet die SPA und stellt Serverless Functions für die KI-Quiz-Generierung bereit. Client-side Routing via React Router.

## Key Decisions
- **Vite + React SPA** statt Next.js: Kein SSR/SEO nötig, weniger Komplexität
- **Supabase Auth** statt eigenem Auth: E-Mail/Passwort mit eingebautem Reset-Flow
- **Polling (30s) statt Realtime**: Einfacher, ausreichend für Klassen mit 30 Schülern
- **React Router**: Ersetzt useState-basierte View-Steuerung für saubere URL-Struktur

## Data Flow
1. Lehrer erstellt Quiz → Anthropic API generiert Fragen → Lehrer bearbeitet im Editor
2. Lehrer veröffentlicht → Supabase speichert Quiz mit Status + Access Code
3. Schüler gibt Code ein → Lädt Quiz aus Supabase → Beantwortet Fragen
4. Schüler sendet Ergebnis → Supabase speichert Session → Lehrer sieht Live-Status

## Routes
- `/` — Schüler-Startseite (Code eingeben)
- `/join/:code` — Direkter Beitrittslink
- `/login` — Lehrer-Login
- `/teacher` — Meine Tests (Tabs: Entwürfe, Aktiv, Abgeschlossen, Archiv)
- `/teacher/new` — Quiz erstellen/generieren
- `/teacher/quiz/:id` — Test-Details + Live-Status + Ergebnisse
- `/teacher/quiz/:id/edit` — Quiz bearbeiten
- `/admin` — Lehrer verwalten, Einstellungen

## Database Tables
- `teachers` — id, email, role (admin|teacher), approved, created_at
- `quizzes` — id, title, questions (jsonb), access_code, status (draft|published|closed|archived), created_by, created_at
- `quiz_sessions` — id, quiz_id, student_name, score, total, answers (jsonb), completed_at
