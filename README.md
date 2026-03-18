# LifeOS 🌿

A gentle productivity journal — tasks, habits, reflections, reminders, and weekly analytics.

## Monorepo Structure

- `apps/api` — Node.js + Express backend (Google OAuth, sessions, analytics)
- `lifeos-web` — React (Vite) + Tailwind frontend (pastel glass UI, charts via Recharts)

## Features

- Google login (OAuth 2.0)
- Cookie-based session authentication
- Tasks + habits + reflections
- Weekly analytics dashboard
- Mood tracking
- Push / reminder infrastructure

## Tech Stack

Frontend:
- React (Vite)
- Tailwind CSS
- Recharts

Backend:
- Node.js
- Express
- PostgreSQL / Supabase
- Passport (Google OAuth)
- Express Sessions

## Deployment

- Frontend: Vercel
- Backend: Render
- Database: Supabase Postgres

## Environment Notes

- `apps/api` supports both `DB_PROVIDER=mysql` and `DB_PROVIDER=postgres`
- For Render + Supabase, use the Supabase session pooler `DATABASE_URL`
- Session storage uses MySQL in legacy mode and Postgres in Supabase mode

---

Built with calm progress in mind 🌷
