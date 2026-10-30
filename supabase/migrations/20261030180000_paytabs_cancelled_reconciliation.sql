-- Your Way: safe closure of verified cancelled PayTabs checkouts.
-- The application must query PayTabs by cart_id and verify ALL
-- transactions are C before invoking this RPC.
-- No existing rows are changed by this migration.

alter table public.paytabs_payment_attempts
  drop constraint if exists paytabs_payment_attempts_status_check;

alter table public.paytabs_payment_attempts
  add constraint paytabs_payment_attempts_status_check
  check (status in (
    'created',
    'initiated',
    'uncertain',
    'approved',
    'requires_review',
    'closed_cancelled'
  ));

-- Persist closure evidence on the order itself.
-- This survives later changes to the attempt's review status.
alter table public.orders
  add column if not exists paytabs_closed_cancelled_at timestamptz;

create function public.block_closed_cancelled_paytabs_reactivation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Once the closure marker exists, it is immutable.
  if old.paytabs_closed_cancelled_at is not null
     and new.paytabs_closed_cancelled_at
         is distinct from old.paytabs_closed_cancelled_at then
    raise exception 'PAYTABS_CANCELLATION_MARKER_IMMUTABLE';
  end if;

  -- A late approval requires reconciliation, never silent fulfillment.
  if new.paytabs_closed_cancelled_at is not null
     and new.status = 'paid' then
    raise exception 'PAYTABS_LATE_APPROVAL_REQUIRES_REVIEW';
  end if;

  return new;
end;
$$;

create trigger trg_block_closed_cancelled_paytabs_reactivation
before update on public.orders
for each row
execute function public.block_closed_cancelled_paytabs_reactivation();

create function public.close_verified_cancelled_paytabs_order(
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
begin
  -- Same lock order as PayTabs fulfillment.
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
     or v_order.private_booking_id is not null
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
     or v_attempt.created_at > now() - interval '1 hour' then
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

  update public.paytabs_payment_attempts
  set status = 'closed_cancelled',
      updated_at = now()
  where id = p_attempt_id;

  update public.orders
  set status = 'failed',
      paytabs_closed_cancelled_at = now()
  where id = p_order_id
    and status = 'pending';

  return true;
end;
$$;

revoke all on function public.close_verified_cancelled_paytabs_order(
  uuid, uuid
) from public, anon, authenticated;

grant execute on function public.close_verified_cancelled_paytabs_order(
  uuid, uuid
) to service_role;
