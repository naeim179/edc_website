-- Backward-compatible prerequisite for the application rollout.
create or replace function public.get_course_lesson_counts(p_course_ids uuid[])
returns table (course_id uuid, lesson_count bigint)
language sql stable security definer set search_path = public
as $$
  select c.id, count(l.id)
  from public.courses c
  left join public.sections s on s.course_id = c.id
  left join public.lessons l on l.section_id = s.id
  where c.id = any(p_course_ids) and c.is_published = true
  group by c.id;
$$;
revoke all on function public.get_course_lesson_counts(uuid[]) from public;
grant execute on function public.get_course_lesson_counts(uuid[])
  to anon, authenticated, service_role;
