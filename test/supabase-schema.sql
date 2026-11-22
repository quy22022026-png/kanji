-- Kawaii JLPT Phase 7 — Supabase schema
-- Run in Supabase SQL Editor. Uses user-scoped RLS.
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_backups enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users can read own backup" on public.user_backups;
create policy "Users can read own backup" on public.user_backups
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own backup" on public.user_backups;
create policy "Users can insert own backup" on public.user_backups
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own backup" on public.user_backups;
create policy "Users can update own backup" on public.user_backups
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.study_sessions;
create policy "Users can read own sessions" on public.study_sessions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own sessions" on public.study_sessions;
create policy "Users can insert own sessions" on public.study_sessions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own sessions" on public.study_sessions;
create policy "Users can update own sessions" on public.study_sessions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists study_sessions_user_completed_idx
  on public.study_sessions(user_id, completed_at desc);

-- Table privileges are still constrained by the RLS policies above.
grant select, insert, update on public.user_backups to authenticated;
grant select, insert, update on public.study_sessions to authenticated;
