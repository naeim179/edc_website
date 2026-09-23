alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

create or replace function public.is_course_instructor(
  p_course_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_instructors ci
    where ci.course_id = p_course_id
      and ci.teacher_id = p_teacher_id
  )
  or exists (
    select 1
    from public.courses c
    where c.id = p_course_id
      and c.instructor_id = p_teacher_id
  );
$$;
