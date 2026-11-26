create schema admin_auth;
revoke all on schema admin_auth from public;

create table admin_auth.admin_mfa_settings (
  singleton boolean primary key default true check (singleton),
  required boolean not null default false
);
insert into admin_auth.admin_mfa_settings default values;

create table admin_auth.admin_mfa_enrollments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  factor_ids uuid[] not null
);

revoke all on admin_auth.admin_mfa_settings, admin_auth.admin_mfa_enrollments from public, anon, authenticated;
alter table admin_auth.admin_mfa_settings enable row level security;
alter table admin_auth.admin_mfa_enrollments enable row level security;

-- A verified factor immediately protects the account. A recorded enrollment
-- still requires MFA if its last factor is removed.
create function admin_auth.admin_mfa_status() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  confirmed_factors uuid[];
begin
  if caller is null or not exists (
    select 1 from public.profiles p where p.id = caller and p.role = 'admin'
  ) then
    return null;
  end if;

  select e.factor_ids into confirmed_factors from admin_auth.admin_mfa_enrollments e where e.user_id = caller;
  if exists (select 1 from auth.mfa_factors f where f.user_id = caller and f.status = 'verified'
    and (confirmed_factors is null or f.id = any(confirmed_factors))) then
    if (select auth.jwt()->>'aal') = 'aal2' then return 'ready'; end if;
    return 'verify';
  end if;

  if confirmed_factors is not null then return 'recovery'; end if;

  if (select required from admin_auth.admin_mfa_settings where singleton) then return 'setup'; end if;
  return 'optional';
end;
$$;

create function public.current_admin_mfa_status() returns text
language sql stable security invoker set search_path = '' as $$
  select admin_auth.admin_mfa_status();
$$;

create function admin_auth.finish_admin_mfa_setup() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if admin_auth.admin_mfa_status() is distinct from 'ready' then
    raise insufficient_privilege using message = 'A verified admin session is required';
  end if;

  -- Serialize completions so the last administrator always enables enforcement.
  perform 1 from admin_auth.admin_mfa_settings where singleton for update;
  insert into admin_auth.admin_mfa_enrollments(user_id, factor_ids)
  select auth.uid(), array(select f.id from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
  on conflict do nothing;
  update admin_auth.admin_mfa_settings set required = true where singleton and not required and not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'admin' and u.deleted_at is null and (
      not exists (select 1 from admin_auth.admin_mfa_enrollments e join auth.mfa_factors f
        on f.id = any(e.factor_ids) and f.user_id = e.user_id
        where e.user_id = p.id and f.status = 'verified')
    )
  );
end;
$$;

create function public.finish_admin_mfa_setup() returns void
language sql security invoker set search_path = '' as $$
  select admin_auth.finish_admin_mfa_setup();
$$;

create function admin_auth.enforce_admin_mfa_rest() returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  -- The path is supplied by PostgREST. This read-only RPC exposes only the
  -- caller's status and remains available to render the verification page.
  if current_setting('request.path', true) = '/rpc/current_admin_mfa_status' then return; end if;
  if admin_auth.admin_mfa_status() in ('verify', 'setup', 'recovery') then
    raise insufficient_privilege using message = 'Administrator MFA required';
  end if;
end;
$$;

revoke all on function admin_auth.admin_mfa_status(), admin_auth.enforce_admin_mfa_rest(),
  admin_auth.finish_admin_mfa_setup(), public.current_admin_mfa_status(), public.finish_admin_mfa_setup()
  from public, anon, authenticated, service_role;
grant usage on schema admin_auth to authenticated, anon, service_role;
grant execute on function admin_auth.admin_mfa_status(), admin_auth.enforce_admin_mfa_rest()
  to authenticated, anon, service_role;
grant execute on function public.current_admin_mfa_status(), public.finish_admin_mfa_setup(),
  admin_auth.finish_admin_mfa_setup() to authenticated;

-- Storage and Realtime do not run PostgREST's pre-request hook. Keep their
-- existing access policies and require MFA in addition to them.
create policy admin_mfa_storage_guard on storage.objects as restrictive for all to authenticated
  using (coalesce((select admin_auth.admin_mfa_status()) not in ('verify', 'setup', 'recovery'), true))
  with check (coalesce((select admin_auth.admin_mfa_status()) not in ('verify', 'setup', 'recovery'), true));

do $$
declare published record;
begin
  for published in
    select schemaname, tablename from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
  loop
    execute format(
      'create policy admin_mfa_realtime_guard on %I.%I as restrictive for select to authenticated
       using (coalesce((select admin_auth.admin_mfa_status()) not in (''verify'', ''setup'', ''recovery''), true))',
      published.schemaname, published.tablename
    );
  end loop;
end;
$$;

create policy admin_mfa_broadcast_guard on realtime.messages as restrictive for all to authenticated
  using (coalesce((select admin_auth.admin_mfa_status()) not in ('verify', 'setup', 'recovery'), true))
  with check (coalesce((select admin_auth.admin_mfa_status()) not in ('verify', 'setup', 'recovery'), true));

-- Refuse to overwrite a different pre-request hook if one is installed later.
do $$
begin
  if exists (select 1 from pg_roles r, unnest(r.rolconfig) s
    where r.rolname = 'authenticator' and s like 'pgrst.db_pre_request=%'
      and s <> 'pgrst.db_pre_request=admin_auth.enforce_admin_mfa_rest') then
    raise exception 'PostgREST already has a pre-request hook';
  end if;
end;
$$;
alter role authenticator set pgrst.db_pre_request = 'admin_auth.enforce_admin_mfa_rest';
notify pgrst, 'reload config';
