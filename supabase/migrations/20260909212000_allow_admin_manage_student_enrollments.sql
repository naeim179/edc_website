-- Admins need to inspect student enrollments and progress
-- from the protected admin dashboard.

drop policy if exists "Admins can view all enrollments"
on public.enrollments;

create policy "Admins can view all enrollments"
on public.enrollments
for select
to authenticated
using (public.is_admin());


drop policy if exists "Admins can delete enrollments"
on public.enrollments;

create policy "Admins can delete enrollments"
on public.enrollments
for delete
to authenticated
using (public.is_admin());


drop policy if exists "Admins can view all lesson progress"
on public.lesson_progress;

create policy "Admins can view all lesson progress"
on public.lesson_progress
for select
to authenticated
using (public.is_admin());


drop policy if exists "Admins can delete lesson progress"
on public.lesson_progress;

create policy "Admins can delete lesson progress"
on public.lesson_progress
for delete
to authenticated
using (public.is_admin());
