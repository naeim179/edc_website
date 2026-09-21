-- ============================================================
-- COURSE SUBSCRIPTIONS
-- 1 month / 3 months
-- Manual renewal / automatic renewal ready
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend orders
-- ------------------------------------------------------------

alter table public.orders
add column if not exists subscription_months integer not null default 1;

alter table public.orders
add column if not exists auto_renew_requested boolean not null default false;

alter table public.orders
add column if not exists fulfilled_at timestamptz;

alter table public.orders
add column if not exists paytabs_tran_ref text;

alter table public.orders
add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_subscription_months_check'
  ) then
    alter table public.orders
    add constraint orders_subscription_months_check
    check (subscription_months in (1, 3));
  end if;
end
$$;

-- Existing successful orders must never be fulfilled again.
update public.orders
set fulfilled_at = coalesce(fulfilled_at, created_at)
where status = 'paid';


-- ------------------------------------------------------------
-- 2. Subscriptions
-- ------------------------------------------------------------

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  duration_months integer not null
    check (duration_months in (1, 3)),

  amount numeric(10,2) not null default 0,

  currency text not null default 'JOD',

  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),

  starts_at timestamptz not null default now(),

  -- NULL is used only for legacy enrollments created
  -- before subscriptions were introduced.
  expires_at timestamptz,

  auto_renew boolean not null default false,

  last_payment_at timestamptz,

  last_payment_tran_ref text,

  renewal_attempted_at timestamptz,

  renewal_failures integer not null default 0,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (student_id, course_id)
);

create index if not exists subscriptions_student_idx
on public.subscriptions(student_id);

create index if not exists subscriptions_course_idx
on public.subscriptions(course_id);

create index if not exists subscriptions_auto_renew_idx
on public.subscriptions(expires_at)
where auto_renew = true
  and status = 'active';


-- ------------------------------------------------------------
-- 3. Sensitive PayTabs tokens stored separately
-- ------------------------------------------------------------

create table if not exists public.subscription_payment_tokens (
  subscription_id uuid primary key
    references public.subscriptions(id)
    on delete cascade,

  token text not null,

  token_tran_ref text not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------

alter table public.subscriptions enable row level security;
alter table public.subscription_payment_tokens enable row level security;


drop policy if exists "Students can read own subscriptions"
on public.subscriptions;

create policy "Students can read own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = student_id);


drop policy if exists "Admins can manage subscriptions"
on public.subscriptions;

create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


grant select
on public.subscriptions
to authenticated;

grant all
on public.subscriptions
to service_role;


-- Payment tokens must NEVER be exposed directly to students.
revoke all
on public.subscription_payment_tokens
from anon, authenticated;

grant all
on public.subscription_payment_tokens
to service_role;


-- ------------------------------------------------------------
-- 5. Preserve existing paid-course enrollments
--
-- Existing students receive legacy unlimited access.
-- We will NOT suddenly expire people who enrolled before
-- subscriptions existed.
-- ------------------------------------------------------------

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
  created_at,
  updated_at
)
select
  e.student_id,
  e.course_id,
  1,
  coalesce(c.price, 0),
  coalesce(c.currency, 'JOD'),
  'active',
  coalesce(e.enrolled_at, now()),
  null,
  false,
  coalesce(e.enrolled_at, now()),
  now()
from public.enrollments e
join public.courses c
  on c.id = e.course_id
where coalesce(c.is_free, false) = false
on conflict (student_id, course_id)
do nothing;


-- ------------------------------------------------------------
-- 6. Atomic payment fulfillment
--
-- Prevents webhook + return page from extending a subscription
-- twice for the same order.
-- ------------------------------------------------------------

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
    v_base_date
    + make_interval(months => v_order.subscription_months);


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


revoke all
on function public.fulfill_subscription_order(uuid, text, text)
from public, anon, authenticated;

grant execute
on function public.fulfill_subscription_order(uuid, text, text)
to service_role;
