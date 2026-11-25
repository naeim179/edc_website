-- Instructor assignments (including legacy links) only authorize accounts
-- whose current profile role is teacher. Existing RLS and token callers
-- keep using this function with the same signature and grants.
create or replace function public.can_read_lesson(
  p_section_id uuid, p_is_free_preview boolean
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.sections s
    join public.courses c on c.id = s.course_id
    left join public.profiles viewer on viewer.id = (select auth.uid())
    where s.id = p_section_id and (
      viewer.role = 'admin'
      or (
        viewer.role = 'teacher'
        and (
          c.instructor_id = viewer.id
          or exists (
            select 1 from public.course_instructors ci
            where ci.course_id = c.id and ci.teacher_id = viewer.id
          )
        )
      )
      or (c.is_published = true and (
        coalesce(p_is_free_preview, false)
        or (coalesce(c.is_free, false) and exists (
          select 1 from public.enrollments e
          where e.student_id = (select auth.uid()) and e.course_id = c.id
        ))
        or (not coalesce(c.is_free, false) and exists (
          select 1 from public.subscriptions sub
          where sub.student_id = (select auth.uid()) and sub.course_id = c.id
            and sub.status = 'active'
            and (sub.expires_at is null or sub.expires_at > now())
        ))
      ))
    )
  );
$$;
