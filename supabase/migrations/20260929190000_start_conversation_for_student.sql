-- دالة لإنشاء محادثة باسم طالب محدد، للاستدعاء من السيرفر فقط (webhook / صفحة النجاح)
create or replace function start_conversation_for_student(
  p_student_id uuid,
  p_course_id uuid,
  p_teacher_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if p_student_id is null then
    raise exception 'student_id مطلوب';
  end if;

  if not exists (
    select 1 from enrollments
    where student_id = p_student_id and course_id = p_course_id
  ) then
    raise exception 'غير مسجل في هذه الدورة';
  end if;

  if not exists (
    select 1 from course_instructors
    where teacher_id = p_teacher_id and course_id = p_course_id
  ) then
    raise exception 'هذا المدرس غير مسؤول عن هذه الدورة';
  end if;

  insert into conversations (student_id, teacher_id, course_id)
  values (p_student_id, p_teacher_id, p_course_id)
  on conflict (student_id, teacher_id, course_id) do nothing;

  select id into v_conversation_id
  from conversations
  where student_id = p_student_id
    and teacher_id = p_teacher_id
    and course_id = p_course_id;

  return v_conversation_id;
end;
$$;

-- سيرفر فقط: ممنوع على أي مستخدم عادي
revoke all on function start_conversation_for_student(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function start_conversation_for_student(uuid, uuid, uuid) to service_role;
