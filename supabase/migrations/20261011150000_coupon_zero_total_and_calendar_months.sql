-- Coupon V2 final correctness hardening

-- Allow a percentage discount up to and including 100%.
alter table public.course_coupons
drop constraint if exists course_coupons_coupon_type_check;

alter table public.course_coupons
add constraint course_coupons_coupon_type_check
check (
  coupon_type in (
    'free_subscription',
    'discount'
  )
  and (
    (
      coupon_type = 'free_subscription'
      and subscription_months between 1 and 60
      and discount_type is null
      and discount_value is null
    )
    or
    (
      coupon_type = 'discount'
      and subscription_months is null
      and discount_type in (
        'percentage',
        'fixed'
      )
      and discount_value > 0
      and (
        discount_type <> 'percentage'
        or discount_value <= 100
      )
    )
  )
);

-- Explicit calendar-month addition using Jordan business time.
-- Example: Jan 31 + 1 month => Feb 28/29, while preserving clock time.
create or replace function public.add_calendar_months_clamped(
  p_base timestamptz,
  p_months integer
)
returns timestamptz
language plpgsql
stable
strict
set search_path = public
as $$
declare
  v_local timestamp;
  v_target_month timestamp;
  v_last_day integer;
  v_day integer;
  v_target timestamp;
begin
  if p_months < 0 then
    raise exception 'INVALID_MONTH_COUNT';
  end if;

  v_local :=
    p_base at time zone 'Asia/Amman';

  v_target_month :=
    date_trunc('month', v_local)
    + make_interval(months => p_months);

  v_last_day :=
    extract(
      day from (
        date_trunc('month', v_target_month)
        + interval '1 month'
        - interval '1 day'
      )
    )::integer;

  v_day :=
    least(
      extract(day from v_local)::integer,
      v_last_day
    );

  v_target :=
    date_trunc('month', v_target_month)
    + make_interval(days => v_day - 1)
    + (
      v_local
      - date_trunc('day', v_local)
    );

  return
    v_target at time zone 'Asia/Amman';
end;
$$;

revoke all
on function public.add_calendar_months_clamped(
  timestamptz,
  integer
)
from public, anon, authenticated;

grant execute
on function public.add_calendar_months_clamped(
  timestamptz,
  integer
)
to service_role;

create or replace function public.preview_course_coupon(
  p_code text,
  p_user_id uuid,
  p_course_id uuid,
  p_original_amount numeric
)
returns table (
  coupon_id uuid,
  coupon_type text,
  subscription_months integer,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  final_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.course_coupons%rowtype;
  v_reserved integer := 0;
  v_discount numeric(10,2) := 0;
  v_final numeric(10,2) := 0;
begin
  select c.*
  into v_coupon
  from public.course_coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.course_id = p_course_id
  limit 1;

  if not found then
    raise exception 'COUPON_INVALID';
  end if;

  if not v_coupon.is_active then
    raise exception 'COUPON_INACTIVE';
  end if;

  if v_coupon.valid_from > now() then
    raise exception 'COUPON_NOT_STARTED';
  end if;

  if v_coupon.valid_until is not null
     and v_coupon.valid_until <= now() then
    raise exception 'COUPON_EXPIRED';
  end if;

  if exists (
    select 1
    from public.coupon_redemptions r
    where r.coupon_id = v_coupon.id
      and r.user_id = p_user_id
      and r.status = 'redeemed'
  ) then
    raise exception 'COUPON_ALREADY_USED';
  end if;

  select count(*)::integer
  into v_reserved
  from public.coupon_redemptions r
  where r.coupon_id = v_coupon.id
    and r.status = 'reserved'
    and r.user_id <> p_user_id
    and r.reservation_expires_at > now();

  if v_coupon.max_uses is not null
     and v_coupon.used_count + v_reserved >= v_coupon.max_uses then
    raise exception 'COUPON_EXHAUSTED';
  end if;

  if v_coupon.coupon_type = 'free_subscription' then
    return query
    select
      v_coupon.id,
      v_coupon.coupon_type,
      v_coupon.subscription_months,
      null::text,
      null::numeric,
      greatest(coalesce(p_original_amount, 0), 0),
      0::numeric;

    return;
  end if;

  if coalesce(p_original_amount, 0) <= 0 then
    raise exception 'COUPON_NO_PAYABLE_AMOUNT';
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount :=
      round(
        (
          p_original_amount *
          v_coupon.discount_value /
          100
        )::numeric,
        2
      );
  else
    v_discount :=
      least(
        v_coupon.discount_value,
        p_original_amount
      );
  end if;

  v_final :=
    greatest(
      round(
        (
          p_original_amount -
          v_discount
        )::numeric,
        2
      ),
      0
    );

  return query
  select
    v_coupon.id,
    v_coupon.coupon_type,
    null::integer,
    v_coupon.discount_type,
    v_coupon.discount_value,
    v_discount,
    v_final;
end;
$$;

create or replace function public.reserve_discount_coupon_for_order(
  p_code text,
  p_user_id uuid,
  p_course_id uuid,
  p_order_id uuid,
  p_original_amount numeric,
  p_reservation_minutes integer default 90
)
returns table (
  coupon_id uuid,
  discount_amount numeric,
  final_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.course_coupons%rowtype;
  v_order public.orders%rowtype;

  v_reserved integer := 0;
  v_discount numeric(10,2) := 0;
  v_final numeric(10,2) := 0;
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.user_id <> p_user_id
     or v_order.course_id <> p_course_id then
    raise exception 'ORDER_MISMATCH';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'ORDER_NOT_PENDING';
  end if;

  update public.coupon_redemptions
  set
    status = 'released',
    updated_at = now()
  where order_id = p_order_id
    and status = 'reserved';

  select c.*
  into v_coupon
  from public.course_coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.course_id = p_course_id
  for update;

  if not found then
    raise exception 'COUPON_INVALID';
  end if;

  if v_coupon.coupon_type <> 'discount' then
    raise exception 'COUPON_NOT_DISCOUNT';
  end if;

  if not v_coupon.is_active then
    raise exception 'COUPON_INACTIVE';
  end if;

  if v_coupon.valid_from > now() then
    raise exception 'COUPON_NOT_STARTED';
  end if;

  if v_coupon.valid_until is not null
     and v_coupon.valid_until <= now() then
    raise exception 'COUPON_EXPIRED';
  end if;

  update public.coupon_redemptions
  set
    status = 'released',
    updated_at = now()
  where coupon_id = v_coupon.id
    and status = 'reserved'
    and reservation_expires_at <= now();

  if exists (
    select 1
    from public.coupon_redemptions r
    where r.coupon_id = v_coupon.id
      and r.user_id = p_user_id
      and r.status = 'redeemed'
  ) then
    raise exception 'COUPON_ALREADY_USED';
  end if;

  select count(*)::integer
  into v_reserved
  from public.coupon_redemptions r
  where r.coupon_id = v_coupon.id
    and r.status = 'reserved'
    and r.reservation_expires_at > now();

  if v_coupon.max_uses is not null
     and v_coupon.used_count + v_reserved >= v_coupon.max_uses then
    raise exception 'COUPON_EXHAUSTED';
  end if;

  if p_original_amount <= 0 then
    raise exception 'COUPON_NO_PAYABLE_AMOUNT';
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount :=
      round(
        (
          p_original_amount *
          v_coupon.discount_value /
          100
        )::numeric,
        2
      );
  else
    v_discount :=
      least(
        v_coupon.discount_value,
        p_original_amount
      );
  end if;

  v_final :=
    greatest(
      round(
        (
          p_original_amount -
          v_discount
        )::numeric,
        2
      ),
      0
    );

  insert into public.coupon_redemptions (
    coupon_id,
    user_id,
    course_id,
    order_id,
    status,
    original_amount,
    discount_amount,
    final_amount,
    reservation_expires_at
  )
  values (
    v_coupon.id,
    p_user_id,
    p_course_id,
    p_order_id,
    'reserved',
    p_original_amount,
    v_discount,
    v_final,
    now() +
      make_interval(
        mins => greatest(
          coalesce(p_reservation_minutes, 90),
          10
        )
      )
  );

  update public.orders
  set
    original_amount = p_original_amount,
    amount = v_final,
    coupon_id = v_coupon.id,
    coupon_code = v_coupon.code,
    coupon_discount_amount = v_discount
  where id = p_order_id;

  return query
  select
    v_coupon.id,
    v_discount,
    v_final;
end;
$$;

create or replace function public.redeem_free_course_coupon(
  p_code text,
  p_user_id uuid,
  p_course_id uuid,
  p_private_booking_id uuid default null
)
returns table (
  coupon_id uuid,
  granted_months integer,
  subscription_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.course_coupons%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_booking public.private_course_bookings%rowtype;

  v_base timestamptz;
  v_expiry timestamptz;

  v_slots integer := 0;
  v_reserved integer := 0;
begin
  select c.*
  into v_coupon
  from public.course_coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.course_id = p_course_id
  for update;

  if not found then
    raise exception 'COUPON_INVALID';
  end if;

  if v_coupon.coupon_type <> 'free_subscription' then
    raise exception 'COUPON_NOT_FREE';
  end if;

  if not v_coupon.is_active then
    raise exception 'COUPON_INACTIVE';
  end if;

  if v_coupon.valid_from > now() then
    raise exception 'COUPON_NOT_STARTED';
  end if;

  if v_coupon.valid_until is not null
     and v_coupon.valid_until <= now() then
    raise exception 'COUPON_EXPIRED';
  end if;

  if exists (
    select 1
    from public.coupon_redemptions r
    where r.coupon_id = v_coupon.id
      and r.user_id = p_user_id
      and r.status = 'redeemed'
  ) then
    raise exception 'COUPON_ALREADY_USED';
  end if;

  update public.coupon_redemptions
  set
    status = 'released',
    updated_at = now()
  where coupon_id = v_coupon.id
    and status = 'reserved'
    and reservation_expires_at <= now();

  select count(*)::integer
  into v_reserved
  from public.coupon_redemptions r
  where r.coupon_id = v_coupon.id
    and r.status = 'reserved'
    and r.reservation_expires_at > now();

  if v_coupon.max_uses is not null
     and v_coupon.used_count + v_reserved >= v_coupon.max_uses then
    raise exception 'COUPON_EXHAUSTED';
  end if;

  if p_private_booking_id is not null then
    select b.*
    into v_booking
    from public.private_course_bookings b
    where b.id = p_private_booking_id
    for update;

    if not found then
      raise exception 'PRIVATE_BOOKING_NOT_FOUND';
    end if;

    if v_booking.student_id <> p_user_id
       or v_booking.course_id <> p_course_id then
      raise exception 'PRIVATE_BOOKING_MISMATCH';
    end if;

    if v_booking.status <> 'pending_payment' then
      raise exception 'PRIVATE_BOOKING_UNAVAILABLE';
    end if;

    if v_booking.hold_expires_at is not null
       and v_booking.hold_expires_at <= now() then
      raise exception 'PRIVATE_BOOKING_EXPIRED';
    end if;

    select count(*)::integer
    into v_slots
    from public.private_booking_slots s
    where s.booking_id = p_private_booking_id;

    if v_slots <> 2 then
      raise exception 'PRIVATE_BOOKING_NEEDS_TWO_SLOTS';
    end if;
  end if;

  insert into public.enrollments (
    student_id,
    course_id
  )
  values (
    p_user_id,
    p_course_id
  )
  on conflict (student_id, course_id)
  do nothing;

  select s.*
  into v_subscription
  from public.subscriptions s
  where s.student_id = p_user_id
    and s.course_id = p_course_id
  for update;

  if found then
    -- Preserve legacy unlimited subscriptions.
    if v_subscription.expires_at is null then
      raise exception 'SUBSCRIPTION_ALREADY_UNLIMITED';
    end if;

    if v_subscription.status = 'active'
       and v_subscription.expires_at > now() then
      v_base := v_subscription.expires_at;
    else
      v_base := now();
    end if;

    v_expiry :=
      public.add_calendar_months_clamped(v_base, v_coupon.subscription_months);

    update public.subscriptions
    set
      duration_months = v_coupon.subscription_months,

      status = 'active',

      starts_at =
        case
          when v_subscription.status = 'active'
           and v_subscription.expires_at > now()
          then starts_at
          else now()
        end,

      expires_at = v_expiry,

      updated_at = now()
    where id = v_subscription.id;

  else
    v_expiry :=
      public.add_calendar_months_clamped(now(), v_coupon.subscription_months);

    insert into public.subscriptions (
      student_id,
      course_id,
      duration_months,
      amount,
      currency,
      status,
      starts_at,
      expires_at,
      auto_renew,
      renewal_failures,
      created_at,
      updated_at
    )
    values (
      p_user_id,
      p_course_id,
      v_coupon.subscription_months,
      0,
      'USD',
      'active',
      now(),
      v_expiry,
      false,
      0,
      now(),
      now()
    );
  end if;

  insert into public.coupon_redemptions (
    coupon_id,
    user_id,
    course_id,
    status,
    original_amount,
    discount_amount,
    final_amount,
    redeemed_at
  )
  values (
    v_coupon.id,
    p_user_id,
    p_course_id,
    'redeemed',
    0,
    0,
    0,
    now()
  );

  update public.course_coupons
  set
    used_count = used_count + 1,

    used_by = p_user_id,

    used_at = now(),

    is_used =
      case
        when max_uses is not null
         and used_count + 1 >= max_uses
        then true
        else false
      end,

    updated_at = now()
  where id = v_coupon.id;

  if p_private_booking_id is not null then
    update public.private_course_bookings
    set
      status = 'confirmed',
      confirmed_at = now(),
      hold_expires_at = null
    where id = p_private_booking_id
      and status = 'pending_payment';
  end if;

  return query
  select
    v_coupon.id,
    v_coupon.subscription_months,
    v_expiry;
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

    select
      token,
      token_tran_ref
    into
      v_existing_token,
      v_existing_token_ref
    from public.subscription_payment_tokens
    where subscription_id = v_subscription.id;

    v_subscription_id := v_subscription.id;

    -- Active subscriptions extend from their existing expiry.
    -- Expired/legacy subscriptions start a new timed period now.
    if v_subscription.expires_at is not null
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
        when public.subscriptions.expires_at is not null
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

  elsif not v_order.auto_renew_requested then

    -- Explicit manual-renew choice disables local automatic charging.
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

-- Fulfill an order whose discount coupon reduced the total to zero.
-- This keeps coupon redemption, subscription activation and Private
-- booking confirmation in the same database transaction.
create or replace function public.fulfill_zero_discount_order(
  p_order_id uuid,
  p_user_id uuid
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
  v_booking public.private_course_bookings%rowtype;
  v_slots integer := 0;
  v_result record;
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.user_id <> p_user_id then
    raise exception 'ORDER_OWNER_MISMATCH';
  end if;

  if v_order.coupon_id is null then
    raise exception 'ZERO_ORDER_REQUIRES_COUPON';
  end if;

  if v_order.amount <> 0 then
    raise exception 'ORDER_AMOUNT_NOT_ZERO';
  end if;

  if v_order.private_booking_id is not null then
    select b.*
    into v_booking
    from public.private_course_bookings b
    where b.id = v_order.private_booking_id
    for update;

    if not found then
      raise exception 'PRIVATE_BOOKING_NOT_FOUND';
    end if;

    if v_booking.student_id <> v_order.user_id
       or v_booking.course_id <> v_order.course_id then
      raise exception 'PRIVATE_BOOKING_MISMATCH';
    end if;

    if v_booking.status = 'pending_payment' then
      if v_booking.hold_expires_at is not null
         and v_booking.hold_expires_at <= now() then
        raise exception 'PRIVATE_BOOKING_EXPIRED';
      end if;

      select count(*)::integer
      into v_slots
      from public.private_booking_slots s
      where s.booking_id = v_booking.id;

      if v_slots <> 2 then
        raise exception 'PRIVATE_BOOKING_NEEDS_TWO_SLOTS';
      end if;

    elsif v_booking.status <> 'confirmed' then
      raise exception 'PRIVATE_BOOKING_UNAVAILABLE';
    end if;
  end if;

  select *
  into v_result
  from public.fulfill_subscription_order(
    p_order_id,
    'COUPON-' || p_order_id::text,
    null
  );

  if v_order.private_booking_id is not null
     and v_booking.status = 'pending_payment' then
    update public.private_course_bookings
    set
      status = 'confirmed',
      confirmed_at = now(),
      hold_expires_at = null
    where id = v_booking.id
      and status = 'pending_payment';

    if not found then
      raise exception 'PRIVATE_BOOKING_CONFIRM_FAILED';
    end if;
  end if;

  return query
  select
    v_result.fulfilled_course_id::uuid,
    v_result.subscription_expires_at::timestamptz,
    v_result.subscription_auto_renew::boolean;
end;
$$;

revoke all
on function public.fulfill_zero_discount_order(
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.fulfill_zero_discount_order(
  uuid,
  uuid
)
to service_role;

revoke all
on function public.preview_course_coupon(
  text,
  uuid,
  uuid,
  numeric
)
from public, anon, authenticated;

grant execute
on function public.preview_course_coupon(
  text,
  uuid,
  uuid,
  numeric
)
to service_role;

revoke all
on function public.reserve_discount_coupon_for_order(
  text,
  uuid,
  uuid,
  uuid,
  numeric,
  integer
)
from public, anon, authenticated;

grant execute
on function public.reserve_discount_coupon_for_order(
  text,
  uuid,
  uuid,
  uuid,
  numeric,
  integer
)
to service_role;

revoke all
on function public.redeem_free_course_coupon(
  text,
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.redeem_free_course_coupon(
  text,
  uuid,
  uuid,
  uuid
)
to service_role;
