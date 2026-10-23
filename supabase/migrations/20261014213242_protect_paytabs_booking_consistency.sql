-- Your Way PayTabs hardening. Requires the matching application release.
-- No existing order or payment is modified by this migration.

create table public.paytabs_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency <> ''),
  subscription_months integer not null check (subscription_months in (1, 3)),
  coupon_id uuid,
  private_booking_id uuid,
  auto_renew_requested boolean not null,
  status text not null default 'created'
    check (status in ('created', 'initiated', 'uncertain', 'approved', 'requires_review')),
  payment_url text,
  tran_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paytabs_fulfillment_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  attempt_id uuid references public.paytabs_payment_attempts(id),
  tran_ref text not null unique,
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.paytabs_payment_attempts enable row level security;
alter table public.paytabs_fulfillment_reviews enable row level security;
revoke all on public.paytabs_payment_attempts from public, anon, authenticated;
revoke all on public.paytabs_fulfillment_reviews from public, anon, authenticated;
grant select, insert, update on public.paytabs_payment_attempts to service_role;
grant select, insert, update on public.paytabs_fulfillment_reviews to service_role;

-- Neither service-role updates nor coupon RPCs may change an order's
-- financial/booking snapshot once a PayTabs checkout was started.
create function public.protect_paytabs_order_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.paytabs_payment_attempts a where a.order_id = old.id
  ) and (
    (old.user_id, old.course_id, old.amount, old.currency,
     old.subscription_months, old.auto_renew_requested, old.private_booking_id,
     old.coupon_id, old.coupon_code, old.coupon_discount_amount,
     old.original_amount, old.source, old.payment_method)
    is distinct from
    (new.user_id, new.course_id, new.amount, new.currency,
     new.subscription_months, new.auto_renew_requested, new.private_booking_id,
     new.coupon_id, new.coupon_code, new.coupon_discount_amount,
     new.original_amount, new.source, new.payment_method)
    or (old.status = 'paid' and new.status <> 'paid')
  ) then
    raise exception 'PAYTABS_ORDER_SNAPSHOT_LOCKED';
  end if;
  return new;
end;
$$;

create trigger trg_protect_paytabs_order_snapshot
before update on public.orders
for each row execute function public.protect_paytabs_order_snapshot();

create function public.protect_paytabs_attempt_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if (old.order_id, old.amount, old.currency, old.subscription_months,
      old.coupon_id, old.private_booking_id, old.auto_renew_requested)
     is distinct from
     (new.order_id, new.amount, new.currency, new.subscription_months,
      new.coupon_id, new.private_booking_id, new.auto_renew_requested)
     or (old.tran_ref is not null and old.tran_ref is distinct from new.tran_ref)
     or (old.payment_url is not null and old.payment_url is distinct from new.payment_url)
  then
    raise exception 'PAYTABS_ATTEMPT_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger trg_protect_paytabs_attempt_snapshot
before update on public.paytabs_payment_attempts
for each row execute function public.protect_paytabs_attempt_snapshot();

-- A student cannot change the two selected appointments while PayTabs
-- may still charge their card. Expired holds can still be released:
-- late approved payments then become review cases, not enrollment.
create function public.protect_paytabs_private_booking()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.paytabs_payment_attempts a
    where a.private_booking_id = old.id
  ) then
    if old.status = 'pending_payment'
       and (new.status in ('cancelled', 'expired'))
       and old.hold_expires_at > now() then
      raise exception 'PAYTABS_PRIVATE_HOLD_IN_PAYMENT';
    end if;
    if old.status = 'pending_payment' and new.status = 'pending_payment'
       and new.hold_expires_at is distinct from old.hold_expires_at then
      raise exception 'PAYTABS_PRIVATE_HOLD_IN_PAYMENT';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_paytabs_private_booking
before update on public.private_course_bookings
for each row execute function public.protect_paytabs_private_booking();

create function public.protect_paytabs_private_slots()
returns trigger language plpgsql set search_path = public as $$
declare
  v_booking_id uuid;
begin
  v_booking_id := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;
  if exists (
    select 1 from public.paytabs_payment_attempts a
    where a.private_booking_id = v_booking_id
  ) then
    raise exception 'PAYTABS_PRIVATE_SLOTS_LOCKED';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_protect_paytabs_private_slots
before insert or update or delete on public.private_booking_slots
for each row execute function public.protect_paytabs_private_slots();

-- Create one immutable checkout attempt under the order row lock.
-- Caller passes the exact expected snapshot calculated before this RPC.
create function public.begin_paytabs_checkout_attempt(
  p_order_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_months integer,
  p_coupon_id uuid,
  p_booking_id uuid,
  p_auto_renew boolean
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_booking public.private_course_bookings%rowtype;
  v_attempt_id uuid;
  v_slot_count integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id <> p_user_id or v_order.status <> 'pending'
     or v_order.source <> 'manual' or v_order.payment_method <> 'paytabs' then
    raise exception 'PAYTABS_ORDER_NOT_ELIGIBLE';
  end if;
  if (v_order.amount, v_order.currency, v_order.subscription_months,
      v_order.coupon_id, v_order.private_booking_id, v_order.auto_renew_requested)
     is distinct from
     (p_amount, p_currency, p_months, p_coupon_id, p_booking_id, p_auto_renew)
     or v_order.amount <= 0 then
    raise exception 'PAYTABS_CHECKOUT_SNAPSHOT_MISMATCH';
  end if;
  if exists(select 1 from public.paytabs_payment_attempts where order_id = p_order_id) then
    raise exception 'PAYTABS_CHECKOUT_ALREADY_STARTED';
  end if;
  if v_order.coupon_id is not null and not exists (
    select 1 from public.coupon_redemptions r
    where r.order_id = v_order.id and r.coupon_id = v_order.coupon_id
      and r.status = 'reserved' and r.reservation_expires_at > now()
  ) then
    raise exception 'PAYTABS_COUPON_NOT_RESERVED';
  end if;
  if v_order.private_booking_id is not null then
    select * into v_booking from public.private_course_bookings
    where id = v_order.private_booking_id for update;
    if not found or v_booking.student_id <> v_order.user_id
      or v_booking.course_id <> v_order.course_id
      or v_booking.status <> 'pending_payment'
      or v_booking.hold_expires_at is null
      or v_booking.hold_expires_at <= now() then
      raise exception 'PAYTABS_PRIVATE_HOLD_INVALID';
    end if;
    select count(*) into v_slot_count from public.private_booking_slots
    where booking_id = v_booking.id;
    if v_slot_count <> 2 then raise exception 'PAYTABS_PRIVATE_SLOTS_INVALID'; end if;
  end if;

  insert into public.paytabs_payment_attempts (
    order_id, amount, currency, subscription_months, coupon_id,
    private_booking_id, auto_renew_requested
  ) values (
    v_order.id, v_order.amount, v_order.currency, v_order.subscription_months,
    v_order.coupon_id, v_order.private_booking_id, v_order.auto_renew_requested
  ) returning id into v_attempt_id;
  return v_attempt_id;
end;
$$;

revoke all on function public.begin_paytabs_checkout_attempt(
  uuid, uuid, numeric, text, integer, uuid, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.begin_paytabs_checkout_attempt(
  uuid, uuid, numeric, text, integer, uuid, uuid, boolean
) to service_role;

-- We deliberately do NOT change the legacy fulfill_subscription_order RPC.
-- Both older callbacks and new attempts enter through this checked wrapper.
-- The inner enrollment/subscription call and Private confirmation commit together.
create function public.fulfill_verified_paytabs_order(
  p_order_id uuid,
  p_attempt_id uuid,
  p_tran_ref text,
  p_amount numeric,
  p_currency text,
  p_token text default null
)
returns table (
  result_state text,
  fulfilled_course_id uuid,
  subscription_expires_at timestamptz,
  subscription_auto_renew boolean
)
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.paytabs_payment_attempts%rowtype;
  v_booking public.private_course_bookings%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_result record;
  v_count integer;
  v_reason text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'PAYTABS_ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'paid' and v_order.fulfilled_at is not null
     and v_order.paytabs_tran_ref = p_tran_ref then
    if v_order.private_booking_id is not null and not exists (
      select 1 from public.private_course_bookings b
      where b.id = v_order.private_booking_id and b.status = 'confirmed'
    ) then
      v_reason := 'PAID_PRIVATE_BOOKING_INCONSISTENT';
    else
      select * into v_subscription from public.subscriptions
      where student_id = v_order.user_id and course_id = v_order.course_id;
      return query select 'paid'::text, v_order.course_id,
        v_subscription.expires_at, v_subscription.auto_renew;
      return;
    end if;
  end if;

  if v_order.status = 'paid' or v_order.fulfilled_at is not null then
    v_reason := coalesce(v_reason, 'APPROVED_ADDITIONAL_TRANSACTION');
  elsif v_order.status not in ('pending', 'failed') then
    v_reason := 'APPROVED_ORDER_NOT_ELIGIBLE';
  elsif p_attempt_id is not null then
    select * into v_attempt from public.paytabs_payment_attempts
    where id = p_attempt_id and order_id = v_order.id for update;
    if not found then
      v_reason := 'ATTEMPT_ORDER_MISMATCH';
    elsif (v_order.amount, v_order.currency, v_order.subscription_months,
           v_order.coupon_id, v_order.private_booking_id,
           v_order.auto_renew_requested)
       is distinct from
          (v_attempt.amount, v_attempt.currency, v_attempt.subscription_months,
           v_attempt.coupon_id, v_attempt.private_booking_id,
           v_attempt.auto_renew_requested) then
      v_reason := 'ATTEMPT_SNAPSHOT_MISMATCH';
    end if;
  elsif exists (select 1 from public.paytabs_payment_attempts
                where order_id = p_order_id) then
    v_reason := 'NEW_ATTEMPT_REQUIRES_ATTEMPT_ID';
  end if;

  if v_reason is null and (
    p_amount is null or p_amount <= 0 or
    p_currency is null or v_order.currency is null or
    p_amount is distinct from v_order.amount or
    upper(p_currency) is distinct from upper(v_order.currency)
  ) then
    v_reason := 'APPROVED_AMOUNT_OR_CURRENCY_MISMATCH';
  end if;

  if v_reason is null and v_order.private_booking_id is not null then
    select * into v_booking from public.private_course_bookings
    where id = v_order.private_booking_id for update;
    if not found or v_booking.student_id <> v_order.user_id
      or v_booking.course_id <> v_order.course_id
      or v_booking.status <> 'pending_payment'
      or v_booking.hold_expires_at is null
      or v_booking.hold_expires_at <= now() then
      v_reason := 'PRIVATE_BOOKING_NO_LONGER_VALID';
    else
      select count(*) into v_count from public.private_booking_slots
      where booking_id = v_booking.id;
      if v_count <> 2 then v_reason := 'PRIVATE_BOOKING_TWO_SLOTS_REQUIRED'; end if;
    end if;
  end if;

  if v_reason is null and v_order.coupon_id is not null and not exists (
    select 1 from public.coupon_redemptions r
    where r.order_id = v_order.id and r.coupon_id = v_order.coupon_id
      and r.status in ('reserved','redeemed')
  ) then
    v_reason := 'COUPON_RESERVATION_MISSING';
  end if;

  if v_reason is null then
    begin
      select * into v_result from public.fulfill_subscription_order(
        v_order.id, p_tran_ref, p_token
      );
      if v_order.private_booking_id is not null then
        update public.private_course_bookings set
          status = 'confirmed', confirmed_at = now(), hold_expires_at = null
        where id = v_booking.id and status = 'pending_payment';
        if not found then raise exception 'PRIVATE_BOOKING_CONFIRM_FAILED'; end if;
      end if;
      if p_attempt_id is not null then
        update public.paytabs_payment_attempts set
          status = 'approved', tran_ref = p_tran_ref, updated_at = now()
        where id = p_attempt_id;
      end if;
    exception when others then
      v_reason := 'ATOMIC_FULFILLMENT_ERROR_' || SQLSTATE;
    end;
  end if;

  if v_reason is not null then
    insert into public.paytabs_fulfillment_reviews (
      order_id, attempt_id, tran_ref, reason
    ) values (v_order.id, p_attempt_id, p_tran_ref, v_reason)
    on conflict (tran_ref) do nothing;
    if p_attempt_id is not null then
      update public.paytabs_payment_attempts set
        status = 'requires_review', updated_at = now()
      where id = p_attempt_id and status <> 'approved';
    end if;
    return query select 'review'::text, null::uuid, null::timestamptz, false;
    return;
  end if;

  return query select 'paid'::text, v_result.fulfilled_course_id::uuid,
    v_result.subscription_expires_at::timestamptz,
    v_result.subscription_auto_renew::boolean;
end;
$$;

revoke all on function public.fulfill_verified_paytabs_order(
  uuid, uuid, text, numeric, text, text
) from public, anon, authenticated;
grant execute on function public.fulfill_verified_paytabs_order(
  uuid, uuid, text, numeric, text, text
) to service_role;

-- Existing coupon functions allow a mutable pending order. Refuse coupon
-- clearing after checkout starts, regardless of current order status.
create or replace function public.clear_coupon_from_order(
  p_order_id uuid, p_user_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.user_id <> p_user_id then raise exception 'ORDER_OWNER_MISMATCH'; end if;
  if v_order.status <> 'pending' then raise exception 'ORDER_NOT_PENDING'; end if;
  if exists (select 1 from public.paytabs_payment_attempts where order_id = p_order_id) then
    raise exception 'PAYTABS_CHECKOUT_ALREADY_STARTED';
  end if;
  update public.coupon_redemptions set status = 'released', updated_at = now()
  where order_id = p_order_id and status = 'reserved';
  update public.orders set amount = original_amount, coupon_id = null,
    coupon_code = null, coupon_discount_amount = 0 where id = p_order_id;
end;
$$;
revoke all on function public.clear_coupon_from_order(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.clear_coupon_from_order(uuid, uuid) to service_role;
