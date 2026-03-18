## Target Stack

- `lifeos-web` on Vercel
- `apps/api` on Render
- Database on Supabase Postgres

## What Changed In This Pass

- Added `DB_PROVIDER` support in env parsing.
- Added `DATABASE_URL`, `DB_SSL`, and `SESSION_TABLE_NAME` env support.
- Added a dual-db pool layer that can talk to MySQL or Postgres.
- Added Postgres session store support with `connect-pg-simple`.
- Guarded MySQL-only startup schema patching so it does not run on Postgres.

## Current Status

The app still contains many MySQL-shaped queries, but the configuration layer now supports an incremental migration instead of a full rewrite in one shot.

## Remaining Migration Phases

### Phase 1: Postgres schema

Create Supabase tables for:

- `users`
- `projects`
- `tasks`
- `habits`
- `habit_checkins`
- `reflections`
- `reminders`
- `push_subscriptions`
- `notification_log`
- session table named by `SESSION_TABLE_NAME`

Starter SQL schema:

- `supabase/schema.sql`

### Phase 2: Query cleanup

Rewrite MySQL-specific SQL patterns:

- `ON DUPLICATE KEY UPDATE` -> `ON CONFLICT ... DO UPDATE`
- `DELETE ... JOIN ...` -> Postgres-compatible delete pattern
- `TINYINT(1)` assumptions -> booleans
- MySQL `SET` / comma-string day storage -> `text[]` or `jsonb`
- `information_schema` / `ALTER TABLE ... AFTER ...` bootstrap logic -> migrations

High-priority files:

- `src/modules/users/users.service.ts`
- `src/modules/habits/habits.service.ts`
- `src/modules/reflections/reflections.service.ts`
- `src/modules/reminders/reminders.service.ts`
- `src/modules/push/push.service.ts`

### Phase 3: Data migration

1. Export MySQL schema and data.
2. Create matching Postgres schema in Supabase.
3. Import data while preserving IDs.
4. Verify foreign keys and unique constraints.

### Phase 4: Deploy

1. Deploy frontend to Vercel.
2. Deploy backend to Render.
3. Set backend env vars:
   - `DB_PROVIDER=postgres`
   - `DATABASE_URL=...`
   - `DB_SSL=true`
   - `SESSION_TABLE_NAME=user_sessions`
4. Point frontend API base URL to Render backend.

## Recommended Next Engineering Step

Migrate the feature modules with the most MySQL-specific upsert behavior first:

1. `reflections`
2. `push_subscriptions`
3. `habit_checkins`
4. `reminders`
