-- Immediate cancellation only after a verified PayTabs signed return.
-- The application must also query all cart transactions from PayTabs.
-- Existing orders are not modified by applying this migration.
create or replace function public.close_verified_cancelled_paytabs_signed_return(
  p_order_id uuid,
  p_attempt_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.paytabs_payment_attempts%rowtype;
  v_booking public.private_course_bookings%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found
     or v_order.status <> 'pending'
     or v_order.payment_method <> 'paytabs'
     or v_order.source <> 'manual'
     or v_order.fulfilled_at is not null
     or v_order.paytabs_tran_ref is not null
     or v_order.coupon_id is not null then
    return false;
  end if;

  select * into v_attempt
  from public.paytabs_payment_attempts
  where id = p_attempt_id
    and order_id = p_order_id
  for update;

  if not found
     or v_attempt.status <> 'initiated'
     or v_attempt.payment_url is null
     or v_attempt.tran_ref is not null
     or v_attempt.created_at > now()
     or v_attempt.private_booking_id
        is distinct from v_order.private_booking_id then
    return false;
  end if;

  if exists (
    select 1
    from public.paytabs_fulfillment_reviews
    where order_id = p_order_id
  ) or exists (
    select 1
    from public.coupon_redemptions
    where order_id = p_order_id
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
       or v_booking.status not in ('pending_payment', 'expired') then
      return false;
    end if;
  end if;

  update public.paytabs_payment_attempts
  set status = 'closed_cancelled',
      updated_at = now()
  where id = p_attempt_id;

  update public.orders
  set status = 'failed',
      paytabs_closed_cancelled_at = now()
  where id = p_order_id
    and status = 'pending';

  if v_order.private_booking_id is not null
     and v_booking.status = 'pending_payment' then
    update public.private_course_bookings
    set status = 'cancelled',
        cancelled_at = now(),
        hold_expires_at = null
    where id = v_booking.id
      and status = 'pending_payment';

    if not found then
      raise exception 'PRIVATE_CANCEL_RECONCILIATION_FAILED';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.close_verified_cancelled_paytabs_signed_return(uuid, uuid) from public, anon, authenticated;
grant execute on function public.close_verified_cancelled_paytabs_signed_return(uuid, uuid) to service_role;
