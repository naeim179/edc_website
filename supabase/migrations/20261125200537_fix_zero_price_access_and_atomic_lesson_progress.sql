-- Use the caller's existing ownership and lesson-access policies. Updating
-- only is_completed preserves the original completion timestamp on retry.
create function public.complete_lesson_progress(p_enrollment_id uuid, p_lesson_id uuid)
returns void language sql security invoker set search_path = '' as $$
  insert into public.lesson_progress(enrollment_id, lesson_id, is_completed)
  values (p_enrollment_id, p_lesson_id, true)
  on conflict (enrollment_id, lesson_id) do update set is_completed = true
  where not lesson_progress.is_completed;
$$;
revoke all on function public.complete_lesson_progress(uuid, uuid) from public, anon;
grant execute on function public.complete_lesson_progress(uuid, uuid) to authenticated;

-- A course-wide zero price is verified again under the course lock. This
-- path has no payment or coupon to fulfill, and never enables auto-renewal.
create function public.activate_zero_price_course(
  p_user_id uuid, p_course_id uuid, p_subscription_months integer,
  p_private_booking_id uuid default null
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_course public.courses%rowtype;
  v_booking public.private_course_bookings%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_price numeric;
  v_enrolled boolean;
  v_now timestamptz;
begin
  if not exists (select 1 from public.profiles where id = p_user_id and role in ('student','admin')) then
    raise exception 'ZERO_PRICE_ACCOUNT_NOT_ALLOWED';
  end if;

  select * into v_course from public.courses where id = p_course_id for update;
  if not found or not v_course.is_published then
    raise exception 'ZERO_PRICE_COURSE_UNAVAILABLE';
  end if;
  select exists (select 1 from public.enrollments where student_id = p_user_id and course_id = p_course_id)
    into v_enrolled;
  if not v_enrolled and not coalesce(v_course.registration_open, false) then
    raise exception 'ZERO_PRICE_REGISTRATION_CLOSED';
  end if;

  if not v_course.is_free then
    v_price := v_course.price;
    if v_course.discount_value > 0 then
      v_price := case v_course.discount_type
        when 'percentage' then v_price - v_price * v_course.discount_value / 100
        when 'fixed' then v_price - v_course.discount_value
        else v_price
      end;
    end if;
    if v_price is null or round(greatest(0, v_price), 2) <> 0 then
      raise exception 'ZERO_PRICE_REQUIRED';
    end if;
    if p_subscription_months is null or p_subscription_months not in (1,3) then
      raise exception 'ZERO_PRICE_DURATION_REQUIRED';
    end if;
  end if;

  if exists (select 1 from public.orders where user_id = p_user_id and course_id = p_course_id and status = 'pending') then
    raise exception 'ZERO_PRICE_PENDING_PAYMENT';
  end if;

  if v_course.course_type = 'private' then
    -- Older payment/coupon paths can hold this row before acquiring the
    -- course lock. Fail cleanly so a simultaneous request can be retried.
    select * into v_booking from public.private_course_bookings b
    where b.course_id = p_course_id and b.student_id = p_user_id
      and ((p_private_booking_id is not null and b.id = p_private_booking_id)
        or (p_private_booking_id is null and b.status = 'confirmed'))
    order by b.created_at desc limit 1 for update nowait;
    if not found or v_booking.status not in ('pending_payment','confirmed') then
      raise exception 'ZERO_PRICE_BOOKING_REQUIRED';
    end if;
    if v_booking.status = 'pending_payment' and (
      v_booking.hold_expires_at is null or v_booking.hold_expires_at <= clock_timestamp()
      or (select count(*) from public.private_booking_slots s where s.booking_id = v_booking.id) <> 2
    ) then
      raise exception 'ZERO_PRICE_BOOKING_UNAVAILABLE';
    end if;
  elsif p_private_booking_id is not null then
    raise exception 'ZERO_PRICE_BOOKING_MISMATCH';
  end if;

  -- An INSERT even on retry applies the existing group seat check. It
  -- prevents reactivating an expired enrollment if the group is now full.
  insert into public.enrollments(student_id, course_id) values (p_user_id, p_course_id)
  on conflict (student_id, course_id) do nothing;

  if not v_course.is_free then
    select * into v_subscription from public.subscriptions
    where student_id = p_user_id and course_id = p_course_id for update nowait;
    v_now := now();
    if not found or v_subscription.status <> 'active'
      or (v_subscription.expires_at is not null and v_subscription.expires_at <= v_now) then
      insert into public.subscriptions(student_id, course_id, duration_months, amount, currency,
        status, starts_at, expires_at, auto_renew, renewal_failures, updated_at)
      values (p_user_id, p_course_id, p_subscription_months, 0, 'USD', 'active', v_now,
        public.add_calendar_months_clamped(v_now, p_subscription_months), false, 0, v_now)
      on conflict (student_id, course_id) do update set
        duration_months = excluded.duration_months, amount = 0, currency = excluded.currency,
        status = 'active', starts_at = excluded.starts_at, expires_at = excluded.expires_at,
        auto_renew = false, renewal_failures = 0, renewal_attempted_at = null,
        renewal_claim_id = null, updated_at = excluded.updated_at;
    end if;
  end if;

  if v_booking.status = 'pending_payment' then
    update public.private_course_bookings
    set status = 'confirmed', confirmed_at = clock_timestamp(), hold_expires_at = null
    where id = v_booking.id;
  end if;
end;
$$;
revoke all on function public.activate_zero_price_course(uuid, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.activate_zero_price_course(uuid, uuid, integer, uuid) to service_role;
