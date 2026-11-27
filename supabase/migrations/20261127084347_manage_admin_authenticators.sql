-- Reveal only the caller's verified TOTP labels and approval state.
create function admin_auth.list_admin_authenticators()
returns table (id uuid, label text, approved boolean)
language sql stable security definer set search_path = '' as $$
  select f.id, f.friendly_name,
         e.user_id is null or f.id = any(e.factor_ids)
  from auth.mfa_factors f
  left join admin_auth.admin_mfa_enrollments e on e.user_id = f.user_id
  where f.user_id = (select auth.uid()) and f.status = 'verified' and f.factor_type = 'totp'
    and admin_auth.admin_mfa_status() in ('verify', 'ready', 'recovery')
  order by f.created_at, f.id;
$$;

create function public.list_admin_authenticators()
returns table (id uuid, label text, approved boolean)
language sql stable security invoker set search_path = '' as $$
  select * from admin_auth.list_admin_authenticators();
$$;

create function admin_auth.update_admin_authenticator(p_factor_id uuid, p_remove boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  approved_factors uuid[];
begin
  if p_factor_id is null or p_remove is null then raise invalid_parameter_value; end if;
  if admin_auth.admin_mfa_status() is distinct from 'ready' then
    raise insufficient_privilege using message = 'A verified admin session is required';
  end if;

  select e.factor_ids into approved_factors from admin_auth.admin_mfa_enrollments e
  where e.user_id = caller for update;
  -- A verified legacy session may not yet have visited the completion screen.
  if not found then
    perform admin_auth.finish_admin_mfa_setup();
    select e.factor_ids into approved_factors from admin_auth.admin_mfa_enrollments e
    where e.user_id = caller for update;
  end if;
  if not exists (select 1 from auth.mfa_factors f
    where f.id = p_factor_id and f.user_id = caller and f.status = 'verified' and f.factor_type = 'totp') then
    raise insufficient_privilege using message = 'Authenticator unavailable';
  end if;

  if p_remove then
    if not exists (select 1 from auth.mfa_factors f where f.user_id = caller
      and f.id <> p_factor_id and f.id = any(approved_factors)
      and f.status = 'verified' and f.factor_type = 'totp') then
      return false;
    end if;
    update admin_auth.admin_mfa_enrollments
    set factor_ids = array_remove(approved_factors, p_factor_id) where user_id = caller;
  elsif not (p_factor_id = any(approved_factors)) then
    update admin_auth.admin_mfa_enrollments
    set factor_ids = array_append(approved_factors, p_factor_id) where user_id = caller;
  end if;
  return true;
end;
$$;

create function public.update_admin_authenticator(p_factor_id uuid, p_remove boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select admin_auth.update_admin_authenticator(p_factor_id, p_remove);
$$;

revoke all on function admin_auth.list_admin_authenticators(), public.list_admin_authenticators(),
  admin_auth.update_admin_authenticator(uuid, boolean), public.update_admin_authenticator(uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function admin_auth.list_admin_authenticators(), public.list_admin_authenticators(),
  admin_auth.update_admin_authenticator(uuid, boolean), public.update_admin_authenticator(uuid, boolean)
  to authenticated;

create or replace function admin_auth.enforce_admin_mfa_rest() returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  -- Both exceptions are read-only and return only the caller's MFA data.
  if current_setting('request.path', true) in (
    '/rpc/current_admin_mfa_status', '/rpc/list_admin_authenticators'
  ) then return; end if;
  if admin_auth.admin_mfa_status() in ('verify', 'setup', 'recovery') then
    raise insufficient_privilege using message = 'Administrator MFA required';
  end if;
end;
$$;
