-- ============================================================
-- Allow authorized course admins to see draft + published courses
-- ============================================================

create or replace function public.can_manage_courses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and (
        is_super_admin = true
        or 'manage_courses' = any(permissions)
      )
  );
$$;

revoke all
on function public.can_manage_courses()
from public, anon;

grant execute
on function public.can_manage_courses()
to authenticated;


drop policy if exists "Course admins can view all courses"
on public.courses;

create policy "Course admins can view all courses"
on public.courses
for select
to authenticated
using (
  public.can_manage_courses()
);


-- Also align write permissions with the same admin permission system.

drop policy if exists "Admins can insert courses"
on public.courses;

create policy "Admins can insert courses"
on public.courses
for insert
to authenticated
with check (
  public.can_manage_courses()
);


drop policy if exists "Admins can update courses"
on public.courses;

create policy "Admins can update courses"
on public.courses
for update
to authenticated
using (
  public.can_manage_courses()
)
with check (
  public.can_manage_courses()
);


drop policy if exists "Admins can delete courses"
on public.courses;

create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using (
  public.can_manage_courses()
);
