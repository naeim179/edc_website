-- ============================================================
-- SUBSCRIPTION ACCESS + SAFE COURSE CATALOG + AUTO RENEW CLAIMS
-- ============================================================

-- ------------------------------------------------------------
-- Public SAFE lesson metadata.
-- Does NOT expose content_url.
-- This lets visitors see the curriculum while the real lessons
-- table remains protected by RLS.
-- ------------------------------------------------------------

create or replace function public.get_course_lesson_catalog(
  p_course_id uuid
)
returns table (
  id uuid,
  section_id uuid,
  course_id uuid,
  title text,
  duration text,
  is_free_preview boolean,
  order_index integer,
  section_order_index integer,
  video_provider text,
  youtube_video_id text,
  mux_asset_id text,
  mux_playback_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.section_id,
    s.course_id,
    l.title,
    l.duration::text,
    coalesce(l.is_free_preview, false),
    l.order_index,
    s.order_index,
    l.video_provider,
    l.youtube_video_id,
    l.mux_asset_id,
    l.mux_playback_id
  from public.lessons l
  join public.sections s
    on s.id = l.section_id
  join public.courses c
    on c.id = s.course_id
  where s.course_id = p_course_id
    and c.is_published = true
  order by
    s.order_index,
    l.order_index;
$$;

revoke all
on function public.get_course_lesson_catalog(uuid)
from public;

grant execute
on function public.get_course_lesson_catalog(uuid)
to anon, authenticated, service_role;


-- ------------------------------------------------------------
-- Actual lesson-content access.
--
-- Allowed:
-- 1) Free preview
-- 2) Admin
-- 3) Assigned instructor
-- 4) Enrolled student in a FREE course
-- 5) Student with active paid subscription
--
-- Legacy paid subscriptions with expires_at = NULL remain active.
-- ------------------------------------------------------------

create or replace function public.can_read_lesson(
  p_section_id uuid,
  p_is_free_preview boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_is_free_preview, false)

    or exists (
      select 1
      from public.sections s
      join public.courses c
        on c.id = s.course_id
      where s.id = p_section_id
        and (
          -- Admin
          exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          )

          -- Assigned instructor
          or exists (
            select 1
            from public.course_instructors ci
            where ci.course_id = c.id
              and ci.teacher_id = auth.uid()
          )

          -- Legacy/direct instructor column
          or c.instructor_id = auth.uid()

          -- Free course enrollment
          or (
            coalesce(c.is_free, false) = true
            and exists (
              select 1
              from public.enrollments e
              where e.student_id = auth.uid()
                and e.course_id = c.id
            )
          )

          -- Active paid subscription
          or (
            coalesce(c.is_free, false) = false
            and exists (
              select 1
              from public.subscriptions sub
              where sub.student_id = auth.uid()
                and sub.course_id = c.id
                and sub.status = 'active'
                and (
                  sub.expires_at is null
                  or sub.expires_at > now()
                )
            )
          )
        )
    );
$$;

grant execute
on function public.can_read_lesson(uuid, boolean)
to anon, authenticated, service_role;


-- ------------------------------------------------------------
-- Claim subscriptions that need automatic renewal.
--
-- FOR UPDATE SKIP LOCKED + renewal_attempted_at prevents two
-- cron executions from charging the same subscription.
-- ------------------------------------------------------------

create or replace function public.claim_due_subscription_renewals(
  p_limit integer default 50
)
returns table (
  subscription_id uuid,
  student_id uuid,
  course_id uuid,
  duration_months integer,
  amount numeric,
  currency text,
  expires_at timestamptz,
  token text,
  token_tran_ref text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query

  with due as (
    select s.id
    from public.subscriptions s
    join public.subscription_payment_tokens t
      on t.subscription_id = s.id
    where s.auto_renew = true
      and s.status = 'active'
      and s.expires_at is not null

      -- Renew shortly BEFORE expiry to avoid access interruption.
      and s.expires_at <= now() + interval '24 hours'

      -- Retry at most once per ~day.
      and (
        s.renewal_attempted_at is null
        or s.renewal_attempted_at < now() - interval '20 hours'
      )

      -- Never create a second pending payment.
      and not exists (
        select 1
        from public.orders o
        where o.user_id = s.student_id
          and o.course_id = s.course_id
          and o.status = 'pending'
      )

    order by s.expires_at
    for update of s skip locked
    limit greatest(coalesce(p_limit, 50), 1)
  ),

  claimed as (
    update public.subscriptions s
    set
      renewal_attempted_at = now(),
      updated_at = now()
    from due
    where s.id = due.id
    returning s.*
  )

  select
    c.id,
    c.student_id,
    c.course_id,
    c.duration_months,
    c.amount,
    c.currency,
    c.expires_at,
    t.token,
    t.token_tran_ref
  from claimed c
  join public.subscription_payment_tokens t
    on t.subscription_id = c.id;
end;
$$;

revoke all
on function public.claim_due_subscription_renewals(integer)
from public, anon, authenticated;

grant execute
on function public.claim_due_subscription_renewals(integer)
to service_role;


-- ------------------------------------------------------------
-- Record automatic-renewal failure.
-- After 3 failed attempts auto renewal stops.
-- Student can still renew manually.
-- ------------------------------------------------------------

create or replace function public.record_subscription_renewal_failure(
  p_subscription_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set
    renewal_failures = renewal_failures + 1,

    auto_renew =
      case
        when renewal_failures + 1 >= 3
          then false
        else auto_renew
      end,

    updated_at = now()
  where id = p_subscription_id;
end;
$$;

revoke all
on function public.record_subscription_renewal_failure(uuid)
from public, anon, authenticated;

grant execute
on function public.record_subscription_renewal_failure(uuid)
to service_role;
