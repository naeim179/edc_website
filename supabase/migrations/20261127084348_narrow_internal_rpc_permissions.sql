-- The assignment helper is called by the existing assignment authorization
-- functions with their owner's privileges.
revoke execute on function public.assignment_is_admin() from public, anon, authenticated;

-- Profile triggers still check the caller role on authenticated updates.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- The super-admin predicate is called by the privileged profile trigger.
revoke execute on function public.is_super_admin() from public, anon, authenticated;
grant execute on function public.is_super_admin() to service_role;

-- These legacy helpers exist on the hosted database and may be absent from a
-- fresh database. Retain server access and the signed-in RLS role check.
do $$
begin
  if to_regprocedure('public.is_course_instructor(uuid,uuid)') is not null then
    revoke execute on function public.is_course_instructor(uuid, uuid) from public, anon, authenticated;
    grant execute on function public.is_course_instructor(uuid, uuid) to service_role;
  end if;
  if to_regprocedure('public.my_role()') is not null then
    revoke execute on function public.my_role() from public, anon;
    grant execute on function public.my_role() to authenticated, service_role;
  end if;
end;
$$;
