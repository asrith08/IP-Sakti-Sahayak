-- Supabase schema migration: create core tables, RLS policies, triggers
-- Safe to re-run: uses CREATE IF NOT EXISTS and OR REPLACE.

-- Enable uuid generation function
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. profiles
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  display_name    text,
  preferred_language text
);

-- Trigger function: update updated_at on every UPDATE
create or replace function update_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach updated_at trigger to profiles (idempotent drop-create)
drop trigger if exists set_updated_at on profiles;
create trigger set_updated_at
  before update on profiles
  for each row
  execute procedure update_updated_at();

-- Enable Row Level Security
alter table profiles enable row level security;

-- Drop old combined policy if it exists, then create explicit per-operation policies.
-- Explicit policies are clearer and prevent accidental privilege escalation.
drop policy if exists "Users can read/write own profile" on profiles;

-- SELECT: a user can only read their own row
create policy "profiles_select_own"
  on profiles for select
  using (id = auth.uid());

-- INSERT: a user can only insert a row whose id matches their own auth uid
create policy "profiles_insert_own"
  on profiles for insert
  with check (id = auth.uid());

-- UPDATE: a user can only update their own row
create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trigger function: auto-create a profile row on new user signup
create or replace function create_profile_if_not_exists()
  returns trigger language plpgsql
  security definer                   -- runs as the function owner, bypasses RLS
  set search_path = public as $$
begin
  insert into public.profiles (id, created_at, updated_at)
    values (new.id, now(), now())
    on conflict (id) do nothing;
  return new;
end;
$$;

-- Attach trigger to auth.users (idempotent drop-create)
drop trigger if exists create_profile_on_user_insert on auth.users;
create trigger create_profile_on_user_insert
  after insert on auth.users
  for each row
  execute function create_profile_if_not_exists();

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. analysis_requests
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists analysis_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  request    jsonb,
  created_at timestamptz default now()
);

alter table analysis_requests enable row level security;

drop policy if exists "Users can read/create/update own analysis_requests" on analysis_requests;

create policy "analysis_requests_select_own"
  on analysis_requests for select
  using (user_id = auth.uid());

create policy "analysis_requests_insert_own"
  on analysis_requests for insert
  with check (user_id = auth.uid());

create policy "analysis_requests_update_own"
  on analysis_requests for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. analyses
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  request_id uuid references analysis_requests(id) on delete set null,
  status     text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  result     jsonb
);

drop trigger if exists set_updated_at on analyses;
create trigger set_updated_at
  before update on analyses
  for each row
  execute procedure update_updated_at();

alter table analyses enable row level security;

drop policy if exists "Users can read/create/update own analyses" on analyses;

create policy "analyses_select_own"
  on analyses for select
  using (user_id = auth.uid());

create policy "analyses_insert_own"
  on analyses for insert
  with check (user_id = auth.uid());

create policy "analyses_update_own"
  on analyses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. checklists
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists checklists (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  checklist   jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists set_updated_at on checklists;
create trigger set_updated_at
  before update on checklists
  for each row
  execute procedure update_updated_at();

alter table checklists enable row level security;

drop policy if exists "Users can read/create/update own checklists" on checklists;

create policy "checklists_select_own"
  on checklists for select
  using (user_id = auth.uid());

create policy "checklists_insert_own"
  on checklists for insert
  with check (user_id = auth.uid());

create policy "checklists_update_own"
  on checklists for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- Indexes for query performance
-- ──────────────────────────────────────────────────────────────────────────────
create index if not exists idx_analysis_requests_user_id on analysis_requests(user_id);
create index if not exists idx_analyses_user_id          on analyses(user_id);
create index if not exists idx_checklists_user_id        on checklists(user_id);

-- End of migration
