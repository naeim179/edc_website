-- Your Way / PayTabs: safe automatic recovery of abandoned checkouts.
--
-- Problem: a PayTabs checkout page that expires without any card attempt
-- leaves NO transaction at PayTabs. /payment/query then answers HTTP 404
-- code 2 "No entries found", which the reconciler could never act on, so
-- the order stayed 'pending' forever and the unique index
-- orders_one_pending_per_student_course_idx locked the student out.
--
-- This migration is purely additive. It does not modify any applied
-- migration, does not touch existing rows (apart from adding two nullable
-- columns), does not weaken any trigger or guard, and does not change RLS.
--
-- Safety model (unchanged from the existing cancellation closure):
--   * The application must query PayTabs by cart_id first and only call
--     this function when PayTabs shows NO transaction, or only final
--     unpaid ones (C/D/E/V/X). Approved/hold/pending/unknown never close.
--   * This function independently refuses anything that was paid, has a
--     tran_ref, is under review, has a redeemed coupon, or is too young.
--   * The closure sets paytabs_closed_cancelled_at. The existing triggers
--     then make it immutable and turn any LATE approval into a review
--     case (PAYTABS_LATE_APPROVAL_REQUIRES_REVIEW), never a silent
--     reactivation and never a second enrollment.
--
-- The 15 minute minimum below = 5 minute hosted-page TTL (paypage_ttl in
-- lib/paytabs.ts) + safety margin for 3DS in flight and delayed webhooks.
-- Keep it equal to EXPIRY_MIN_AGE_MS in app/api/payments/reconcile/route.ts.

alter table public.orders
  add column if not exists paytabs_closed_reason text,
  add column if not exists paytabs_last_reconciled_at timestamptz;

-- Lets the reconciler work through the queue least-recently-checked first,
-- so permanently pending orders can never starve the rest of the queue.
create index if not exists orders_paytabs_reconcile_queue_idx
  on public.orders (paytabs_last_reconciled_at nulls first, created_at)
  where status = 'pending'
    and payment_method = 'paytabs'
    and source = 'manual';

create or replace function public.close_expired_unpaid_paytabs_order(
  p_order_id uuid,
  p_attempt_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_age constant interval := interval '15 minutes';
  v_order public.orders%rowtype;
  v_attempt public.paytabs_payment_attempts%rowtype;
  v_booking public.private_course_bookings%rowtype;
begin
  -- Same lock order as PayTabs fulfillment: order, attempt, booking.
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found
     or v_order.status is distinct from 'pending'
     or v_order.payment_method is distinct from 'paytabs'
     or v_order.source is distinct from 'manual'
     or v_order.fulfilled_at is not null
     or v_order.paytabs_tran_ref is not null
     or v_order.paytabs_closed_cancelled_at is not null then
    return false;
  end if;

  if p_attempt_id is not null then
    -- Checkout was started. 'created' and 'uncertain' attempts never
    -- handed a payment URL to the student, 'initiated' ones did; all
    -- three are closable once the hosted page is certainly dead.
    select * into v_attempt
    from public.paytabs_payment_attempts
    where id = p_attempt_id
      and order_id = p_order_id
    for update;

    -- orders.id is unique in paytabs_payment_attempts today; this keeps the
    -- closure safe even if that constraint is ever relaxed.
    if not found
       or exists (
         select 1
         from public.paytabs_payment_attempts
         where order_id = p_order_id
           and id <> p_attempt_id
       )
       or v_attempt.status not in ('created', 'initiated', 'uncertain')
       or v_attempt.tran_ref is not null
       or v_attempt.created_at > now() - v_min_age
       or v_attempt.private_booking_id
          is distinct from v_order.private_booking_id then
      return false;
    end if;
  else
    -- Orphan: the checkout flow aborted before an attempt was created,
    -- so no hosted page exists for this order.
    if exists (
      select 1
      from public.paytabs_payment_attempts
      where order_id = p_order_id
    )
       or v_order.created_at is null
       or v_order.created_at > now() - v_min_age then
      return false;
    end if;
  end if;

  -- Anything already flagged for a human, or a coupon that was actually
  -- redeemed, is never closed automatically.
  if exists (
    select 1
    from public.paytabs_fulfillment_reviews
    where order_id = p_order_id
  ) or exists (
    select 1
    from public.coupon_redemptions
    where order_id = p_order_id
      and status = 'redeemed'
  ) then
    return false;
  end if;

  if v_order.private_booking_id is not null then
    select * into v_booking
    from public.private_course_bookings
    where id = v_order.private_booking_id
    for update;

    if not found
       or v_booking.student_id <> v_order.user_id
       or v_booking.course_id <> v_order.course_id
       or v_booking.status not in ('pending_payment', 'expired', 'cancelled') then
      return false;
    end if;
  end if;

  -- Order of the next statements matters: protect_paytabs_private_booking
  -- only lets a live Private hold be cancelled after the attempt is
  -- 'closed_cancelled' and the order is 'failed' with the closure marker.
  if p_attempt_id is not null then
    update public.paytabs_payment_attempts
    set status = 'closed_cancelled',
        updated_at = now()
    where id = p_attempt_id;
  end if;

  update public.orders
  set status = 'failed',
      paytabs_closed_cancelled_at = now(),
      paytabs_closed_reason = 'expired_unpaid'
  where id = p_order_id
    and status = 'pending';

  -- Free the reserved discount coupon so the student can use it again.
  -- A late approval then fails the coupon check and becomes a review case.
  perform public.release_coupon_reservation_for_order(p_order_id);

  if v_order.private_booking_id is not null
     and v_booking.status = 'pending_payment' then
    update public.private_course_bookings
    set status = 'cancelled',
        cancelled_at = now(),
        hold_expires_at = null
    where id = v_booking.id
      and status = 'pending_payment';

    if not found then
      raise exception 'PRIVATE_EXPIRY_RECONCILIATION_FAILED';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.close_expired_unpaid_paytabs_order(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.close_expired_unpaid_paytabs_order(uuid, uuid)
  to service_role;
