drop policy if exists "Admins can view all profiles"
on public.profiles;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  public.is_admin()
  or id = auth.uid()
);
