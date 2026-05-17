# Supabase setup

The API stores the existing application state as one JSON document in Supabase.
This keeps the current frontend API and backend validation flow unchanged.

## 1. Create the table

Open the Supabase SQL editor and run:

```sql
create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

The backend uses the service role key, so do not expose it in frontend code.
Keep Row Level Security policies closed unless you later move Supabase access
directly into the browser.

## 2. Configure local environment variables

Create a local `.env` file from `.env.example` and fill in your Supabase values:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STATE_TABLE=app_state
SUPABASE_STATE_ID=school_promo_registry
```

Find these values in Supabase project settings:

- `SUPABASE_URL`: Project Settings -> API -> Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API -> service_role key

## 3. Run the app

```bash
npm run dev
```

On the first API read, the backend will create an empty `school_promo_registry`
state row if it does not exist.

## Notes

- Existing `data/db.json` is no longer read or written by the API.
- Writes replace the full JSON document, matching the previous local JSON
  behavior. If multiple users edit at the same time, the last write wins.
- If you want to migrate existing local data, copy the JSON object from
  `data/db.json` into the `data` column for the `school_promo_registry` row.
