-- The private helper reads precisely the current authenticated account. Its
-- invoker wrapper exposes the same contract to PostgREST without extending
-- table-level access to other profiles.
create function private.read_own_profile()
returns table (
  full_name text, phone text, avatar_url text, role public.app_role,
  username text, is_super_admin boolean, permissions text[]
)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.phone, p.avatar_url, p.role, p.username,
         p.is_super_admin, p.permissions
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke all on function private.read_own_profile() from public, anon;
grant execute on function private.read_own_profile() to authenticated;

create function public.read_own_profile()
returns table (
  full_name text, phone text, avatar_url text, role public.app_role,
  username text, is_super_admin boolean, permissions text[]
)
language sql stable security invoker set search_path = '' as $$
  select p.full_name, p.phone, p.avatar_url, p.role, p.username,
         p.is_super_admin, p.permissions
  from private.read_own_profile() p;
$$;

revoke all on function public.read_own_profile() from public, anon;
grant execute on function public.read_own_profile() to authenticated;
