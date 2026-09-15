-- Allow teachers to view courses assigned to them
create policy "Teachers can view assigned courses"
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.course_instructors ci
    where ci.course_id = courses.id
    and ci.teacher_id = auth.uid()
  )
);
