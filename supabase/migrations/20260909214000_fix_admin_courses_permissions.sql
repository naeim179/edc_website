-- Allow authenticated users to attempt course management operations.
-- RLS policies below restrict those operations to admins only.

grant insert, update, delete
on table public.courses
to authenticated;


drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
on public.courses
for insert
to authenticated
with check (public.is_admin());


drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
on public.courses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using (public.is_admin());
