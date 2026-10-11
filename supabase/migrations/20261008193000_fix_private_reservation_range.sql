-- ============================================================
-- Fix Private 1-to-1 reservation flow
-- - Support start_time -> end_time
-- - Safely reuse student's active hold
-- - Prevent two students from holding the same private course
-- - Snapshot selected schedule into private_booking_slots
-- ============================================================

alter table public.private_course_availability
add column if not exists end_time time;

update public.private_course_availability
set end_time = (start_time + interval '1 hour')::time
where end_time is null;

alter table public.private_course_availability
alter column end_time set not null;


alter table public.private_booking_slots
add column if not exists end_time time;

update public.private_booking_slots
set end_time = (start_time + interval '1 hour')::time
where end_time is null;

alter table public.private_booking_slots
alter column end_time set not null;


create or replace function public.reserve_private_course(
  p_course_id uuid,
  p_slot_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_course_type text;
  v_registration_open boolean;
  v_booking_id uuid;
  v_slot_count integer;
  v_unique_slot_count integer;
  v_valid_slot_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'Course is required';
  end if;

  v_slot_count := cardinality(p_slot_ids);

  if v_slot_count is null
     or v_slot_count < 1
     or v_slot_count > 2 then
    raise exception 'Choose one or two appointments only';
  end if;

  select count(distinct slot_id)
  into v_unique_slot_count
  from unnest(p_slot_ids) as selected(slot_id);

  if v_unique_slot_count <> v_slot_count then
    raise exception 'Duplicate appointments are not allowed';
  end if;


  -- Lock the course row so two students cannot reserve it simultaneously.
  select
    c.course_type::text,
    coalesce(c.registration_open, false)
  into
    v_course_type,
    v_registration_open
  from public.courses c
  where c.id = p_course_id
    and c.is_published = true
  for update;

  if not found then
    raise exception 'Course not found';
  end if;

  if v_course_type <> 'private' then
    raise exception 'This course is not private';
  end if;

  if not v_registration_open then
    raise exception 'Registration is currently closed';
  end if;


  -- Expire old holds first.
  update public.private_course_bookings
  set status = 'expired'
  where course_id = p_course_id
    and status = 'pending_payment'
    and (
      hold_expires_at is null
      or hold_expires_at <= now()
    );


  -- A confirmed private booking makes the whole course unavailable.
  if exists (
    select 1
    from public.private_course_bookings b
    where b.course_id = p_course_id
      and b.status = 'confirmed'
  ) then
    raise exception 'Course already booked';
  end if;


  -- Another student's active hold blocks this course temporarily.
  if exists (
    select 1
    from public.private_course_bookings b
    where b.course_id = p_course_id
      and b.status = 'pending_payment'
      and b.hold_expires_at > now()
      and b.student_id <> v_user_id
  ) then
    raise exception 'Course temporarily held';
  end if;


  -- Validate all selected slots before creating/updating the booking.
  select count(*)
  into v_valid_slot_count
  from public.private_course_availability a
  where a.course_id = p_course_id
    and a.is_active = true
    and a.id = any(p_slot_ids)
    and a.end_time is not null;

  if v_valid_slot_count <> v_slot_count then
    raise exception 'Invalid availability selection';
  end if;


  -- Reuse this student's existing active hold if one exists.
  select b.id
  into v_booking_id
  from public.private_course_bookings b
  where b.course_id = p_course_id
    and b.student_id = v_user_id
    and b.status = 'pending_payment'
    and b.hold_expires_at > now()
  order by b.created_at desc
  limit 1
  for update;


  if v_booking_id is null then

    insert into public.private_course_bookings (
      course_id,
      student_id,
      status,
      hold_expires_at
    )
    values (
      p_course_id,
      v_user_id,
      'pending_payment',
      now() + interval '15 minutes'
    )
    returning id
    into v_booking_id;

  else

    update public.private_course_bookings
    set hold_expires_at =
      now() + interval '15 minutes'
    where id = v_booking_id;

  end if;


  -- Student may change his selection while the hold is active.
  delete from public.private_booking_slots
  where booking_id = v_booking_id;


  -- Snapshot BOTH start and end times.
  insert into public.private_booking_slots (
    booking_id,
    availability_slot_id,
    day_of_week,
    start_time,
    end_time
  )
  select
    v_booking_id,
    a.id,
    a.day_of_week,
    a.start_time,
    a.end_time
  from public.private_course_availability a
  where a.course_id = p_course_id
    and a.is_active = true
    and a.id = any(p_slot_ids);


  return v_booking_id;
end;
$$;


revoke all
on function public.reserve_private_course(uuid, uuid[])
from public, anon;

grant execute
on function public.reserve_private_course(uuid, uuid[])
to authenticated, service_role;


create or replace function public.release_private_course_hold(
  p_booking_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.private_course_bookings
  set
    status = 'cancelled',
    cancelled_at = now()
  where id = p_booking_id
    and student_id = auth.uid()
    and status = 'pending_payment';
end;
$$;

revoke all
on function public.release_private_course_hold(uuid)
from public, anon;

grant execute
on function public.release_private_course_hold(uuid)
to authenticated, service_role;
