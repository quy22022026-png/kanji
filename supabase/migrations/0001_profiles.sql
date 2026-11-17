-- Neko Japanese: user profile and role foundation
-- Run this migration in Supabase SQL Editor before enabling the app.

create type public.app_role as enum ('admin', 'learner');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Admin can read all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

-- A trigger creates a learner profile when an account is provisioned in Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'learner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- 1) Disable public sign-ups in Supabase Authentication settings.
-- 2) Create the 2–3 learner accounts and the single admin account manually.
-- 3) Promote the chosen admin by running:
--    update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
-- 4) Do not expose the Supabase service_role key in frontend code.
