-- Your Way / PayTabs follow-up hardening.
-- Apply AFTER 20261014213242_protect_paytabs_booking_consistency.sql.
-- The applied migration must remain unchanged.
-- This file does not delete or rewrite existing business records.

-- A checkout attempt snapshots the selected two Private appointments.
-- Lock the booking row(s) before changing slot records, so that the
-- checkout-start RPC and a slot edit cannot race past one another.
-- On UPDATE check BOTH old and new booking IDs: a slot must not be moved
-- out of a checkout-protected booking, nor moved into one.
create or replace function public.protect_paytabs_private_slots()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_booking_id uuid;
  v_new_booking_id uuid;
begin
  if tg_op = 'INSERT' then
    v_new_booking_id := new.booking_id;
  elsif tg_op = 'DELETE' then
    v_old_booking_id := old.booking_id;
  else
    v_old_booking_id := old.booking_id;
    v_new_booking_id := new.booking_id;
  end if;

  -- The checkout-start RPC holds the booking row FOR UPDATE before
  -- counting the slots and inserting an attempt. This shared lock order
  -- ensures an edit either finishes before the snapshot, or sees it.
  perform 1
  from public.private_course_bookings b
  where b.id in (v_old_booking_id, v_new_booking_id)
  order by b.id
  for update;

  if exists (
    select 1
    from public.paytabs_payment_attempts a
    where a.private_booking_id in (v_old_booking_id, v_new_booking_id)
  ) then
    raise exception 'PAYTABS_PRIVATE_SLOTS_LOCKED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- App-side 'check pending then insert' is not concurrency-safe.
-- This constraint covers manual checkout, CliQ and renewal together.
-- Abort safely if older app versions already produced duplicates;
-- an operator must investigate them rather than discard payments.
do $$
begin
  if exists (
    select 1
    from public.orders
    where status = 'pending'
    group by user_id, course_id
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_PENDING_ORDERS_FOUND: inspect pending orders before creating unique index';
  end if;
end;
$$;

create unique index if not exists orders_one_pending_per_student_course_idx
  on public.orders (user_id, course_id)
  where status = 'pending';

-- A manually approved CliQ order must confirm Private booking in the
-- SAME transaction as enrollment/subscription fulfillment.
-- Keep the existing hold duration: a late approval must be investigated,
-- not silently converted into a paid enrollment without an appointment.
create function public.fulfill_verified_cliq_order(p_order_id uuid)
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
  v_booking public.private_course_bookings%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_result record;
  v_slot_count integer;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.payment_method is distinct from 'cliq'
     or v_order.source is distinct from 'manual' then
    raise exception 'CLIQ_ORDER_NOT_ELIGIBLE';
  end if;

  -- Repeated admin approval never extends a subscription twice.
  if v_order.status = 'paid' and v_order.fulfilled_at is not null then
    if v_order.private_booking_id is not null and not exists (
      select 1 from public.private_course_bookings b
      where b.id = v_order.private_booking_id and b.status = 'confirmed'
    ) then
      raise exception 'CLIQ_PAID_PRIVATE_BOOKING_REQUIRES_REVIEW';
    end if;

    select * into v_subscription
    from public.subscriptions
    where student_id = v_order.user_id and course_id = v_order.course_id;

    return query select v_order.course_id,
      v_subscription.expires_at,
      v_subscription.auto_renew;
    return;
  end if;

  if v_order.status is distinct from 'pending' or v_order.fulfilled_at is not null then
    raise exception 'CLIQ_ORDER_NOT_PENDING';
  end if;

  if v_order.private_booking_id is not null then
    select * into v_booking
    from public.private_course_bookings
    where id = v_order.private_booking_id
    for update;

    if not found
       or v_booking.student_id is distinct from v_order.user_id
       or v_booking.course_id is distinct from v_order.course_id
       or v_booking.status is distinct from 'pending_payment'
       or v_booking.hold_expires_at is null
       or v_booking.hold_expires_at <= now() then
      raise exception 'CLIQ_PRIVATE_BOOKING_REQUIRES_REVIEW';
    end if;

    select count(*) into v_slot_count
    from public.private_booking_slots
    where booking_id = v_booking.id;

    if v_slot_count <> 2 then
      raise exception 'CLIQ_PRIVATE_TWO_SLOTS_REQUIRED';
    end if;
  end if;

  if v_order.coupon_id is not null and not exists (
    select 1 from public.coupon_redemptions r
    where r.order_id = v_order.id
      and r.coupon_id = v_order.coupon_id
      and r.status = 'reserved'
      and r.reservation_expires_at > now()
  ) then
    raise exception 'CLIQ_COUPON_RESERVATION_REQUIRES_REVIEW';
  end if;

  select * into v_result
  from public.fulfill_subscription_order(
    v_order.id,
    'MANUAL-CLIQ-' || v_order.id::text,
    null
  );

  if v_order.private_booking_id is not null then
    update public.private_course_bookings
    set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
    where id = v_booking.id and status = 'pending_payment';

    if not found then
      raise exception 'CLIQ_PRIVATE_CONFIRM_FAILED';
    end if;
  end if;

  return query select v_result.fulfilled_course_id::uuid,
    v_result.subscription_expires_at::timestamptz,
    v_result.subscription_auto_renew::boolean;
end;
$$;

revoke all on function public.fulfill_verified_cliq_order(uuid)
  from public, anon, authenticated;
grant execute on function public.fulfill_verified_cliq_order(uuid)
  to service_role;
