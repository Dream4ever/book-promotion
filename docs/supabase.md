# Supabase setup

The API now stores data in normalized Supabase tables instead of one JSON
document. The frontend API shape is unchanged: `/api/data` still returns
`schools`, `books`, `promoters`, and `reports`.

## 1. Create the tables

Open the Supabase SQL editor and run:

```sql
create table if not exists public.schools (
  id text primary key,
  province text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (province, name)
);

create table if not exists public.books (
  id text primary key,
  isbn text not null unique,
  title text not null,
  price numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.promoters (
  id text primary key,
  name text not null,
  contact text not null default '',
  phone text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (name, phone)
);

create table if not exists public.promoter_agency_records (
  id text primary key,
  promoter_id text not null references public.promoters(id) on delete cascade,
  year text not null,
  agency_period text not null default '',
  workload text not null default '',
  sort_order integer not null default 0,
  unique (promoter_id, year)
);

create table if not exists public.promoter_territories (
  agency_record_id text not null references public.promoter_agency_records(id) on delete cascade,
  province text not null,
  accepting boolean not null default true,
  sort_order integer not null default 0,
  primary key (agency_record_id, province)
);

create table if not exists public.reports (
  id text primary key,
  school_id text not null references public.schools(id) on delete cascade,
  book_mode text not null check (book_mode in ('single', 'all', 'exclude')),
  book_id text not null default '',
  promoter_id text not null references public.promoters(id) on delete cascade,
  term text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  sort_order integer not null default 0
);

create table if not exists public.report_books (
  report_id text not null references public.reports(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (report_id, book_id)
);

create index if not exists idx_reports_school_term
  on public.reports (school_id, term);

create index if not exists idx_report_books_book
  on public.report_books (book_id);
```

The backend uses the service role key, so do not expose it in frontend code.
Keep Row Level Security policies closed unless you later move Supabase access
directly into the browser.

## 2. Configure local environment variables

Create a local `.env` file from `.env.example` and fill in your Supabase values:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Table names default to the names in the SQL above. Override them only if your
project uses different table names:

```bash
SUPABASE_SCHOOLS_TABLE=schools
SUPABASE_BOOKS_TABLE=books
SUPABASE_PROMOTERS_TABLE=promoters
SUPABASE_PROMOTER_AGENCY_RECORDS_TABLE=promoter_agency_records
SUPABASE_PROMOTER_TERRITORIES_TABLE=promoter_territories
SUPABASE_REPORTS_TABLE=reports
SUPABASE_REPORT_BOOKS_TABLE=report_books
```

Find the required values in Supabase project settings:

- `SUPABASE_URL`: Project Settings -> API -> Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API -> service_role key

## 3. Migrate existing JSON data

If the old `public.app_state` table still contains the previous
`school_promo_registry` JSON row, leave these compatibility variables unset or
set them to the old values:

```bash
SUPABASE_STATE_TABLE=app_state
SUPABASE_STATE_ID=school_promo_registry
```

On the first API read, if the new normalized tables are empty, the backend will
read `app_state.data`, normalize it, and write it into the new tables.

After verifying the migrated data, the old `app_state` table is no longer used
by the app and can be archived or dropped manually.

## 4. Run the app

```bash
npm run dev
```

## Notes

- Existing `data/db.json` is no longer read or written by the API.
- Writes are persisted across normalized tables. The current API mutation flow
  still rewrites the small registry snapshot after each change, but the database
  schema is now queryable by entity and relationship.
- `report_books` stores the saved book set for each report. For `exclude` mode,
  this is the final promoted book set after exclusions, matching existing
  conflict and analytics rules.
