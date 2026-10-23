-- Your Way: Private enrollment removal and cancelled-subscription reactivation.
-- Run AFTER 20261024001000_fix_paytabs_slot_race_and_pending_orders.sql.
-- Existing migrations must remain unchanged. No existing rows updated here.
-- Backward-compatible RPC signatures: current Cloudflare code needs no changes.
-- NOTE: This does not refund historical PayTabs charges when an admin removes
-- a student. Refund decisions remain an explicit separate merchant workflow.

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

  -- Do not revoke an enrollment while a payment might still settle.
  -- Otherwise a callback could silently re-enroll the student.
  if exists (
    select 1
    from public.orders o
    where o.user_id = p_student_id
      and o.course_id = v_course_id
      and o.status = 'pending'
  ) then
    raise exception 'ADMIN_REMOVE_BLOCKED_PENDING_ORDER';
  end if;

  -- Even an order marked failed can have an unresolved PayTabs attempt.
  if exists (
    select 1
    from public.paytabs_payment_attempts a
    join public.orders o on o.id = a.order_id
    where o.user_id = p_student_id
      and o.course_id = v_course_id
      and a.status in ('created', 'initiated', 'uncertain', 'requires_review')
  ) then
    raise exception 'ADMIN_REMOVE_BLOCKED_UNRESOLVED_PAYTABS';
  end if;

  -- Releasing a Private booking is part of the SAME transaction as
  -- revoking subscription/access. Preserve bookings and slot history.
  -- A paid order remains in payment history; this is NOT a refund.
  update public.private_course_bookings b
  set status = 'cancelled',
      cancelled_at = now(),
      hold_expires_at = null
  where b.student_id = p_student_id
    and b.course_id = v_course_id
    and b.status in ('confirmed', 'pending_payment');

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

create or replace function public.fulfill_subscription_order(
  p_order_id uuid,
  p_tran_ref text,
  p_token text default null
)
returns table (
  fulfilled_course_id uuid,
  subscription_expires_at timestamptz,
  subscription_auto_renew boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_subscription public.subscriptions%rowtype;

  v_subscription_id uuid;
  v_base_date timestamptz;
  v_new_expiry timestamptz;

  v_existing_token text;
  v_existing_token_ref text;

  v_effective_token text;
  v_effective_token_ref text;

  v_auto_renew boolean;
begin

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;


  -- Idempotency:
  -- callback and return page may both try to fulfill.
  if v_order.status = 'paid'
     and v_order.fulfilled_at is not null then

    select *
    into v_subscription
    from public.subscriptions
    where student_id = v_order.user_id
      and course_id = v_order.course_id;

    return query
    select
      v_order.course_id,
      v_subscription.expires_at,
      v_subscription.auto_renew;

    return;
  end if;


  if v_order.subscription_months not in (1, 3) then
    raise exception 'Invalid subscription duration';
  end if;


  -- Enrollment is permanent so student progress is preserved.
  insert into public.enrollments (
    student_id,
    course_id
  )
  values (
    v_order.user_id,
    v_order.course_id
  )
  on conflict (student_id, course_id)
  do nothing;


  select *
  into v_subscription
  from public.subscriptions
  where student_id = v_order.user_id
    and course_id = v_order.course_id
  for update;


  if found then

    if v_subscription.status = 'active' then
      select
        token,
        token_tran_ref
      into
        v_existing_token,
        v_existing_token_ref
      from public.subscription_payment_tokens
      where subscription_id = v_subscription.id;
    end if;

    v_subscription_id := v_subscription.id;

    -- Active subscriptions extend from their existing expiry.
    -- Expired/legacy subscriptions start a new timed period now.
    if v_subscription.status = 'active'
       and v_subscription.expires_at is not null
       and v_subscription.expires_at > now() then
      v_base_date := v_subscription.expires_at;
    else
      v_base_date := now();
    end if;

  else

    v_subscription_id := gen_random_uuid();
    v_base_date := now();

  end if;


  v_new_expiry :=
    public.add_calendar_months_clamped(v_base_date, v_order.subscription_months);


  v_effective_token :=
    coalesce(
      nullif(p_token, ''),
      v_existing_token
    );

  v_effective_token_ref :=
    case
      when nullif(p_token, '') is not null
        then p_tran_ref
      else v_existing_token_ref
    end;


  v_auto_renew :=
    v_order.auto_renew_requested
    and v_effective_token is not null
    and v_effective_token_ref is not null;


  insert into public.subscriptions (
    id,
    student_id,
    course_id,
    duration_months,
    amount,
    currency,
    status,
    starts_at,
    expires_at,
    auto_renew,
    last_payment_at,
    last_payment_tran_ref,
    renewal_failures,
    created_at,
    updated_at
  )
  values (
    v_subscription_id,
    v_order.user_id,
    v_order.course_id,
    v_order.subscription_months,
    v_order.amount,
    coalesce(v_order.currency, 'JOD'),
    'active',
    now(),
    v_new_expiry,
    v_auto_renew,
    now(),
    p_tran_ref,
    0,
    now(),
    now()
  )
  on conflict (student_id, course_id)
  do update set
    duration_months = excluded.duration_months,
    amount = excluded.amount,
    currency = excluded.currency,
    status = 'active',

    starts_at =
      case
        when public.subscriptions.status = 'active'
             and public.subscriptions.expires_at is not null
             and public.subscriptions.expires_at > now()
          then public.subscriptions.starts_at
        else now()
      end,

    expires_at = v_new_expiry,

    auto_renew = v_auto_renew,

    last_payment_at = now(),

    last_payment_tran_ref = p_tran_ref,

    renewal_failures = 0,

    updated_at = now();


  -- Store token only when auto-renew is actually available.
  if v_auto_renew then

    insert into public.subscription_payment_tokens (
      subscription_id,
      token,
      token_tran_ref,
      created_at,
      updated_at
    )
    values (
      v_subscription_id,
      v_effective_token,
      v_effective_token_ref,
      now(),
      now()
    )
    on conflict (subscription_id)
    do update set
      token = excluded.token,
      token_tran_ref = excluded.token_tran_ref,
      updated_at = now();

  elsif not v_auto_renew then

    -- Never retain a stale token when auto-renew is not enabled.
    -- In particular, reactivation of cancelled subscriptions must not
    -- accidentally resurrect credentials from the old subscription.
    delete from public.subscription_payment_tokens
    where subscription_id = v_subscription_id;

  end if;


  update public.orders
  set
    status = 'paid',
    fulfilled_at = now(),
    paytabs_tran_ref = p_tran_ref
  where id = v_order.id;


  return query
  select
    v_order.course_id,
    v_new_expiry,
    v_auto_renew;

end;
$$;

-- Retain the existing service-role-only permission boundary explicitly.
revoke all on function public.admin_remove_student_enrollment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_remove_student_enrollment(uuid, uuid)
  to service_role;

revoke all on function public.fulfill_subscription_order(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_subscription_order(uuid, text, text)
  to service_role;
