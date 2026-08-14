-- User roles supported by the MVP.
create type public.app_role as enum ('student', 'admin');

-- Public profile data linked one-to-one with Supabase Auth users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security.
alter table public.profiles enable row level security;

-- Do not expose the table to unauthenticated visitors.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

-- Logged-in users may read their own profile.
grant select on table public.profiles to authenticated;

-- Users may update profile fields, but cannot change their own role.
grant update (full_name, phone, avatar_url) on table public.profiles to authenticated;

-- Backend operations using the service role retain full access.
grant all on table public.profiles to service_role;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Automatically update updated_at whenever a profile changes.
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

-- Automatically create a profile after a new Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
