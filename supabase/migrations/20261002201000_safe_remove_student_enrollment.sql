create or replace function public.admin_remove_student_enrollment(
  p_student_id uuid,
  p_enrollment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_subscription_id uuid;
begin
  -- نتأكد أن التسجيل موجود ويخص نفس الطالب.
  select e.course_id
  into v_course_id
  from public.enrollments e
  where e.id = p_enrollment_id
    and e.student_id = p_student_id
  for update;

  if v_course_id is null then
    raise exception 'Enrollment not found';
  end if;

  -- إذا كان للدورة اشتراك، نوقفه بالكامل.
  select s.id
  into v_subscription_id
  from public.subscriptions s
  where s.student_id = p_student_id
    and s.course_id = v_course_id
  for update;

  if v_subscription_id is not null then
    -- إزالة رمز الدفع حتى لا يحدث تجديد تلقائي لاحقاً.
    delete from public.subscription_payment_tokens
    where subscription_id = v_subscription_id;

    update public.subscriptions
    set
      status = 'cancelled',
      auto_renew = false,
      updated_at = now()
    where id = v_subscription_id;
  end if;

  -- حذف تسجيل الطالب في الدورة.
  delete from public.enrollments
  where id = p_enrollment_id
    and student_id = p_student_id;
end;
$$;

revoke all
on function public.admin_remove_student_enrollment(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.admin_remove_student_enrollment(uuid, uuid)
to service_role;
