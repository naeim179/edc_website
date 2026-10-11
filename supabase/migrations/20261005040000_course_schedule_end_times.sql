-- ============================================================
-- Course schedule ranges: FROM -> TO
-- ============================================================

alter table public.courses
add column if not exists group_end_time time;

update public.courses
set group_end_time =
  case
    when group_start_time <= time '22:59'
      then (group_start_time + interval '1 hour')::time
    else time '23:59'
  end
where group_start_time is not null
  and group_end_time is null;

alter table public.courses
drop constraint if exists courses_group_time_range_check;

alter table public.courses
add constraint courses_group_time_range_check
check (
  (
    group_start_time is null
    and group_end_time is null
  )
  or
  (
    group_start_time is not null
    and group_end_time is not null
    and group_end_time > group_start_time
  )
);


alter table public.private_course_availability
add column if not exists end_time time;

update public.private_course_availability
set end_time =
  case
    when start_time <= time '22:59'
      then (start_time + interval '1 hour')::time
    else time '23:59'
  end
where end_time is null;

alter table public.private_course_availability
alter column end_time set not null;

alter table public.private_course_availability
drop constraint if exists private_course_availability_time_range_check;

alter table public.private_course_availability
add constraint private_course_availability_time_range_check
check (
  end_time > start_time
);


alter table public.private_booking_slots
add column if not exists end_time time;

update public.private_booking_slots bs
set end_time = a.end_time
from public.private_course_availability a
where a.id = bs.availability_slot_id
  and bs.end_time is null;

update public.private_booking_slots
set end_time =
  case
    when start_time <= time '22:59'
      then (start_time + interval '1 hour')::time
    else time '23:59'
  end
where end_time is null;

alter table public.private_booking_slots
alter column end_time set not null;

alter table public.private_booking_slots
drop constraint if exists private_booking_slots_time_range_check;

alter table public.private_booking_slots
add constraint private_booking_slots_time_range_check
check (
  end_time > start_time
);


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
  v_is_published boolean;
  v_registration_open boolean;

  v_slot_count integer;
  v_valid_slot_count integer;

  v_booking_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'student'
  ) then
    raise exception 'Student account required';
  end if;

  select
    c.course_type::text,
    c.is_published,
    c.registration_open
  into
    v_course_type,
    v_is_published,
    v_registration_open
  from public.courses c
  where c.id = p_course_id
  for update;

  if not found then
    raise exception 'Course not found';
  end if;

  if v_course_type <> 'private' then
    raise exception 'Course is not private';
  end if;

  if not coalesce(v_is_published, false)
     or not coalesce(v_registration_open, true) then
    raise exception 'Registration is currently closed';
  end if;

  v_slot_count :=
    coalesce(cardinality(p_slot_ids), 0);

  if v_slot_count < 1
     or v_slot_count > 2 then
    raise exception 'Choose one or two appointments only';
  end if;

  if (
    select count(distinct x)
    from unnest(p_slot_ids) as x
  ) <> v_slot_count then
    raise exception 'Duplicate appointment selected';
  end if;

  update public.private_course_bookings
  set status = 'expired'
  where course_id = p_course_id
    and status = 'pending_payment'
    and (
      hold_expires_at is null
      or hold_expires_at <= now()
    );

  if exists (
    select 1
    from public.private_course_bookings b
    where b.course_id = p_course_id
      and b.status = 'confirmed'
  ) then
    raise exception 'Private course is already booked';
  end if;

  select b.id
  into v_booking_id
  from public.private_course_bookings b
  where b.course_id = p_course_id
    and b.student_id = v_user_id
    and b.status = 'pending_payment'
    and b.hold_expires_at > now()
  limit 1;

  if v_booking_id is null
     and exists (
       select 1
       from public.private_course_bookings b
       where b.course_id = p_course_id
         and b.status = 'pending_payment'
         and b.hold_expires_at > now()
     ) then
    raise exception 'Private course is temporarily held';
  end if;

  select count(*)
  into v_valid_slot_count
  from public.private_course_availability a
  where a.course_id = p_course_id
    and a.is_active = true
    and a.id = any(p_slot_ids);

  if v_valid_slot_count <> v_slot_count then
    raise exception 'One or more selected appointments are unavailable';
  end if;

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

    delete from public.private_booking_slots
    where booking_id = v_booking_id;
  end if;

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
  where a.id = any(p_slot_ids);

  return v_booking_id;
end;
$$;

revoke all
on function public.reserve_private_course(uuid, uuid[])
from public, anon;

grant execute
on function public.reserve_private_course(uuid, uuid[])
to authenticated;
