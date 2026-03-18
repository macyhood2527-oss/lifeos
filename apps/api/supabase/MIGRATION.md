## MySQL -> Supabase Migration

### Required environment variables

Source MySQL:

- `SRC_DB_HOST`
- `SRC_DB_PORT`
- `SRC_DB_USER`
- `SRC_DB_PASSWORD`
- `SRC_DB_NAME`

Target Postgres:

- `DATABASE_URL`
- `DB_SSL=true`

### Run order

1. Make sure `supabase/schema.sql` has already been run.
2. Point the app itself at Supabase only after the import succeeds.
3. Run the migration script from `apps/api`.

### Command

```bash
SRC_DB_HOST=... \
SRC_DB_PORT=3306 \
SRC_DB_USER=... \
SRC_DB_PASSWORD=... \
SRC_DB_NAME=... \
DATABASE_URL='postgresql://...' \
DB_SSL=true \
node scripts/migrate-mysql-to-postgres.js
```

### What the script does

- Reads all core app tables from MySQL
- Truncates the Supabase target tables
- Inserts rows in dependency-safe order
- Preserves IDs
- Converts:
  - MySQL `0/1` flags -> Postgres booleans
  - reminder `days_of_week` comma strings -> `text[]`
  - MySQL datetime/date values -> Postgres-friendly formats
- Resets table ID sequences after import

### Important notes

- This replaces target data in Supabase for the migrated tables.
- Session rows are not migrated.
- Keep the old MySQL database alive until you verify the app data after import.
- After import, test:
  - login
  - projects/tasks
  - habits/check-ins
  - reflections
  - reminders
  - notifications

