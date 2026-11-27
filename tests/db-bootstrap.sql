-- Test-only Supabase API surface, on a disposable plain PostgreSQL database.
-- This is not a replacement for Supabase Auth/Storage integration testing.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator nologin;
create schema auth;
create schema storage;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text,
  raw_user_meta_data jsonb default '{}', created_at timestamptz default now(),
  banned_until timestamptz, last_sign_in_at timestamptz, deleted_at timestamptz,
  is_anonymous boolean default false
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  factor_type text not null default 'totp',
  friendly_name text,
  created_at timestamptz not null default now()
);
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner_id text default auth.uid()::text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;
create function storage.allow_any_operation(expected text[]) returns boolean language sql stable as $$
  select coalesce(
    regexp_replace(current_setting('storage.operation', true), '^storage\.', '') = any(expected),
    false
  );
$$;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant all on auth.users, storage.buckets to service_role;
create publication supabase_realtime;

-- Minimal Realtime authorization surface for private-channel policy regressions.
create schema realtime;
create table realtime.messages (id uuid default gen_random_uuid(), topic text, extension text, payload jsonb);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true); $$;
grant usage on schema realtime to authenticated,anon;
grant select,insert on realtime.messages to authenticated,anon;
