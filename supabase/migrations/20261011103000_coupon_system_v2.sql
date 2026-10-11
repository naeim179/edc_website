-- ============================================================
-- COUPON SYSTEM V2
-- Free subscription coupons + discount coupons
-- ============================================================

alter table public.course_coupons
add column if not exists coupon_type text
  not null default 'free_subscription',
add column if not exists subscription_months integer,
add column if not exists discount_type text,
add column if not exists discount_value numeric(10,2),
add column if not exists valid_from timestamptz
  not null default now(),
add column if not exists valid_until timestamptz,
add column if not exists max_uses integer
  default 1,
add column if not exists used_count integer
  not null default 0,
add column if not exists updated_at timestamptz
  not null default now();

-- Legacy coupons were free single-use coupons.
update public.course_coupons
set
  coupon_type = 'free_subscription',
  subscription_months = coalesce(subscription_months, 1),
  max_uses = coalesce(max_uses, 1),
  used_count =
    case
      when is_used then greatest(used_count, 1)
      else used_count
    end;

alter table public.course_coupons
drop constraint if exists course_coupons_coupon_type_check;

alter table public.course_coupons
add constraint course_coupons_coupon_type_check
check (
  coupon_type in (
    'free_subscription',
    'discount'
  )
);

alter table public.course_coupons
drop constraint if exists course_coupons_config_check;

alter table public.course_coupons
add constraint course_coupons_config_check
check (
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
    and discount_type in ('percentage', 'fixed')
    and discount_value > 0
    and (
      discount_type <> 'percentage'
      or discount_value < 100
    )
  )
);

alter table public.course_coupons
drop constraint if exists course_coupons_validity_check;

alter table public.course_coupons
add constraint course_coupons_validity_check
check (
  valid_until is null
  or valid_until > valid_from
);

alter table public.course_coupons
drop constraint if exists course_coupons_max_uses_check;

alter table public.course_coupons
add constraint course_coupons_max_uses_check
check (
  max_uses is null
  or max_uses >= 1
);

alter table public.course_coupons
drop constraint if exists course_coupons_used_count_check;

alter table public.course_coupons
add constraint course_coupons_used_count_check
check (used_count >= 0);

create index if not exists course_coupons_type_idx
on public.course_coupons(coupon_type);

create index if not exists course_coupons_validity_idx
on public.course_coupons(valid_from, valid_until);


-- ============================================================
-- Subscriptions:
-- coupon can grant any duration from 1 to 60 months.
-- Paid plans can still remain 1 / 3 months in application logic.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%duration_months%'
  loop
    execute format(
      'alter table public.subscriptions drop constraint %I',
      r.conname
    );
  end loop;
end
$$;

alter table public.subscriptions
add constraint subscriptions_duration_months_check
check (duration_months between 1 and 60);


-- ============================================================
-- Orders store coupon snapshot
-- ============================================================

alter table public.orders
add column if not exists coupon_id uuid
  references public.course_coupons(id)
  on delete set null,
add column if not exists coupon_code text,
add column if not exists original_amount numeric(10,2),
add column if not exists coupon_discount_amount numeric(10,2)
  not null default 0;

update public.orders
set original_amount = amount
where original_amount is null;

alter table public.orders
alter column original_amount set default 0;

alter table public.orders
alter column original_amount set not null;

alter table public.orders
drop constraint if exists orders_coupon_discount_amount_check;

alter table public.orders
add constraint orders_coupon_discount_amount_check
check (coupon_discount_amount >= 0);

create index if not exists orders_coupon_id_idx
on public.orders(coupon_id);


-- ============================================================
-- Redemption history
-- ============================================================

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),

  coupon_id uuid not null
    references public.course_coupons(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  order_id uuid
    references public.orders(id)
    on delete set null,

  status text not null default 'redeemed'
    check (
      status in (
        'reserved',
        'redeemed',
        'released'
      )
    ),

  original_amount numeric(10,2)
    not null default 0,

  discount_amount numeric(10,2)
    not null default 0,

  final_amount numeric(10,2)
    not null default 0,

  reservation_expires_at timestamptz,

  redeemed_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);

create index if not exists coupon_redemptions_coupon_idx
on public.coupon_redemptions(coupon_id, status);

create index if not exists coupon_redemptions_user_idx
on public.coupon_redemptions(user_id, created_at desc);

create index if not exists coupon_redemptions_order_idx
on public.coupon_redemptions(order_id);

create unique index if not exists coupon_redemptions_active_user_unique
on public.coupon_redemptions(coupon_id, user_id)
where status in ('reserved', 'redeemed');

create unique index if not exists coupon_redemptions_active_order_unique
on public.coupon_redemptions(order_id)
where order_id is not null
  and status in ('reserved', 'redeemed');


-- Convert old used coupons to redemption history.
insert into public.coupon_redemptions (
  coupon_id,
  user_id,
  course_id,
  status,
  original_amount,
  discount_amount,
  final_amount,
  redeemed_at,
  created_at,
  updated_at
)
select
  c.id,
  c.used_by,
  c.course_id,
  'redeemed',
  0,
  0,
  0,
  coalesce(c.used_at, c.created_at),
  coalesce(c.used_at, c.created_at),
  now()
from public.course_coupons c
where c.is_used = true
  and c.used_by is not null
  and not exists (
    select 1
    from public.coupon_redemptions r
    where r.coupon_id = c.id
      and r.user_id = c.used_by
      and r.status = 'redeemed'
  );

alter table public.coupon_redemptions enable row level security;

revoke all
on public.coupon_redemptions
from anon, authenticated;

grant all
on public.coupon_redemptions
to service_role;


-- ============================================================
-- Coupon preview
-- ============================================================

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

  if v_final <= 0 then
    raise exception 'COUPON_DISCOUNT_TO_ZERO';
  end if;

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


-- ============================================================
-- Free subscription redemption
-- ============================================================

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
      v_base +
      make_interval(
        months => v_coupon.subscription_months
      );

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
      now() +
      make_interval(
        months => v_coupon.subscription_months
      );

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


-- ============================================================
-- Discount reservation
-- ============================================================

create or replace function public.clear_coupon_from_order(
  p_order_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
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

  update public.coupon_redemptions
  set
    status = 'released',
    updated_at = now()
  where order_id = p_order_id
    and status = 'reserved';

  update public.orders
  set
    amount = original_amount,
    coupon_id = null,
    coupon_code = null,
    coupon_discount_amount = 0
  where id = p_order_id;
end;
$$;

revoke all
on function public.clear_coupon_from_order(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.clear_coupon_from_order(uuid, uuid)
to service_role;


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

  if v_final <= 0 then
    raise exception 'COUPON_DISCOUNT_TO_ZERO';
  end if;

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


-- ============================================================
-- Finalize / release coupon reservations
-- ============================================================

create or replace function public.release_coupon_reservation_for_order(
  p_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.coupon_redemptions
  set
    status = 'released',
    updated_at = now()
  where order_id = p_order_id
    and status = 'reserved';

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

revoke all
on function public.release_coupon_reservation_for_order(uuid)
from public, anon, authenticated;

grant execute
on function public.release_coupon_reservation_for_order(uuid)
to service_role;


create or replace function public.finalize_coupon_redemption_for_order(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_redemption public.coupon_redemptions%rowtype;
  v_coupon public.course_coupons%rowtype;
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id;

  if not found or v_order.coupon_id is null then
    return false;
  end if;

  select r.*
  into v_redemption
  from public.coupon_redemptions r
  where r.order_id = p_order_id
    and r.coupon_id = v_order.coupon_id
    and r.status in ('reserved', 'released', 'redeemed')
  order by r.created_at desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  if v_redemption.status = 'redeemed' then
    return true;
  end if;

  select c.*
  into v_coupon
  from public.course_coupons c
  where c.id = v_redemption.coupon_id
  for update;

  if not found then
    return false;
  end if;

  update public.coupon_redemptions
  set
    status = 'redeemed',
    redeemed_at = now(),
    reservation_expires_at = null,
    updated_at = now()
  where id = v_redemption.id;

  update public.course_coupons
  set
    used_count = used_count + 1,
    used_by = v_redemption.user_id,
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

  return true;
end;
$$;

revoke all
on function public.finalize_coupon_redemption_for_order(uuid)
from public, anon, authenticated;

grant execute
on function public.finalize_coupon_redemption_for_order(uuid)
to service_role;


create or replace function public.sync_coupon_redemption_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid'
     and old.status is distinct from 'paid' then

    perform public.finalize_coupon_redemption_for_order(new.id);

  elsif new.status in ('failed', 'cancelled')
    and old.status is distinct from new.status then

    perform public.release_coupon_reservation_for_order(new.id);

  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_coupon_redemption_from_order
on public.orders;

create trigger trg_sync_coupon_redemption_from_order
after update of status
on public.orders
for each row
execute function public.sync_coupon_redemption_from_order();


grant select, insert, update, delete
on public.course_coupons
to service_role;

grant all
on public.coupon_redemptions
to service_role;
