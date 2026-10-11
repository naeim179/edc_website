-- ============================================================
-- YOUR WAY
-- Group schedules + Private 1-to-1 booking foundation
-- ============================================================


-- ------------------------------------------------------------
-- 1. Course registration + group schedule
-- ------------------------------------------------------------

alter table public.courses
add column if not exists registration_open boolean not null default true;

alter table public.courses
add column if not exists group_day_of_week smallint;

alter table public.courses
add column if not exists group_start_time time;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_group_day_of_week_check'
  ) then
    alter table public.courses
    add constraint courses_group_day_of_week_check
    check (
      group_day_of_week is null
      or group_day_of_week between 0 and 6
    );
  end if;
end
$$;


-- ------------------------------------------------------------
-- 2. Private course availability
-- Admin defines the available weekly slots.
-- ------------------------------------------------------------

create table if not exists public.private_course_availability (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  day_of_week smallint not null
    check (day_of_week between 0 and 6),

  start_time time not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    course_id,
    day_of_week,
    start_time
  )
);

create index if not exists private_course_availability_course_idx
on public.private_course_availability(course_id);


-- ------------------------------------------------------------
-- 3. Private bookings
-- One Private course = one student.
--
-- pending_payment:
-- temporary checkout hold
--
-- confirmed:
-- paid / fully reserved
-- ------------------------------------------------------------

create table if not exists public.private_course_bookings (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  status text not null default 'pending_payment'
    check (
      status in (
        'pending_payment',
        'confirmed',
        'cancelled',
        'expired'
      )
    ),

  hold_expires_at timestamptz,

  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists private_course_bookings_course_idx
on public.private_course_bookings(course_id);

create index if not exists private_course_bookings_student_idx
on public.private_course_bookings(student_id);

create unique index if not exists private_course_one_confirmed_idx
on public.private_course_bookings(course_id)
where status = 'confirmed';

create unique index if not exists private_course_one_pending_idx
on public.private_course_bookings(course_id)
where status = 'pending_payment';


-- ------------------------------------------------------------
-- 4. Selected booking slots
--
-- We keep a snapshot of day/time so changing admin availability
-- later does not destroy the student's confirmed schedule.
-- ------------------------------------------------------------

create table if not exists public.private_booking_slots (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.private_course_bookings(id)
    on delete cascade,

  availability_slot_id uuid
    references public.private_course_availability(id)
    on delete set null,

  day_of_week smallint not null
    check (day_of_week between 0 and 6),

  start_time time not null,

  created_at timestamptz not null default now(),

  unique (
    booking_id,
    day_of_week,
    start_time
  )
);

create index if not exists private_booking_slots_booking_idx
on public.private_booking_slots(booking_id);


-- ------------------------------------------------------------
-- 5. Link checkout order to private booking
-- ------------------------------------------------------------

alter table public.orders
add column if not exists private_booking_id uuid
references public.private_course_bookings(id)
on delete set null;

create index if not exists orders_private_booking_idx
on public.orders(private_booking_id);


-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------

alter table public.private_course_availability
enable row level security;

alter table public.private_course_bookings
enable row level security;

alter table public.private_booking_slots
enable row level security;


-- Availability privileges

grant select
on public.private_course_availability
to anon, authenticated;

grant insert, update, delete
on public.private_course_availability
to authenticated;

grant all
on public.private_course_availability
to service_role;


drop policy if exists "Public can view private course availability"
on public.private_course_availability;

create policy "Public can view private course availability"
on public.private_course_availability
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.is_published = true
      and c.course_type = 'private'
  )
);


drop policy if exists "Course admins manage private availability"
on public.private_course_availability;

create policy "Course admins manage private availability"
on public.private_course_availability
for all
to authenticated
using (
  public.can_manage_courses()
)
with check (
  public.can_manage_courses()
);


-- Assigned teacher may see their availability.

drop policy if exists "Teachers view assigned private availability"
on public.private_course_availability;

create policy "Teachers view assigned private availability"
on public.private_course_availability
for select
to authenticated
using (
  exists (
    select 1
    from public.course_instructors ci
    where ci.course_id =
      private_course_availability.course_id
      and ci.teacher_id = auth.uid()
  )
);


-- Booking privileges

grant select, update
on public.private_course_bookings
to authenticated;

grant all
on public.private_course_bookings
to service_role;


drop policy if exists "Students view own private bookings"
on public.private_course_bookings;

create policy "Students view own private bookings"
on public.private_course_bookings
for select
to authenticated
using (
  student_id = auth.uid()
);


drop policy if exists "Course admins manage private bookings"
on public.private_course_bookings;

create policy "Course admins manage private bookings"
on public.private_course_bookings
for all
to authenticated
using (
  public.can_manage_courses()
)
with check (
  public.can_manage_courses()
);


drop policy if exists "Teachers view assigned private bookings"
on public.private_course_bookings;

create policy "Teachers view assigned private bookings"
on public.private_course_bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.course_instructors ci
    where ci.course_id =
      private_course_bookings.course_id
      and ci.teacher_id = auth.uid()
  )
);


-- Booking slots privileges

grant select
on public.private_booking_slots
to authenticated;

grant all
on public.private_booking_slots
to service_role;


drop policy if exists "Students view own private booking slots"
on public.private_booking_slots;

create policy "Students view own private booking slots"
on public.private_booking_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.private_course_bookings b
    where b.id = booking_id
      and b.student_id = auth.uid()
  )
);


drop policy if exists "Course admins view private booking slots"
on public.private_booking_slots;

create policy "Course admins view private booking slots"
on public.private_booking_slots
for select
to authenticated
using (
  public.can_manage_courses()
);


drop policy if exists "Teachers view assigned private booking slots"
on public.private_booking_slots;

create policy "Teachers view assigned private booking slots"
on public.private_booking_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.private_course_bookings b
    join public.course_instructors ci
      on ci.course_id = b.course_id
    where b.id = booking_id
      and ci.teacher_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- 7. Public registration state
-- ------------------------------------------------------------

create or replace function public.course_registration_state(
  p_course_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
begin
  select *
  into v_course
  from public.courses
  where id = p_course_id;

  if not found
     or not coalesce(v_course.is_published, false) then
    return 'unavailable';
  end if;

  if v_course.course_type = 'group' then
    if coalesce(v_course.registration_open, true) then
      return 'open';
    end if;

    return 'closed';
  end if;

  if exists (
    select 1
    from public.private_course_bookings b
    where b.course_id = p_course_id
      and b.status = 'confirmed'
  ) then
    return 'booked';
  end if;

  if not coalesce(v_course.registration_open, true) then
    return 'closed';
  end if;

  if exists (
    select 1
    from public.private_course_bookings b
    where b.course_id = p_course_id
      and b.status = 'pending_payment'
      and b.hold_expires_at > now()
  ) then
    return 'held';
  end if;

  return 'available';
end;
$$;

revoke all
on function public.course_registration_state(uuid)
from public;

grant execute
on function public.course_registration_state(uuid)
to anon, authenticated, service_role;


-- ------------------------------------------------------------
-- 8. Atomic Private reservation
--
-- Maximum TWO selected appointments.
-- The same day may contain both appointments.
-- ------------------------------------------------------------

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
    raise exception
      'Choose one or two appointments only';
  end if;

  if (
    select count(distinct x)
    from unnest(p_slot_ids) as x
  ) <> v_slot_count then
    raise exception
      'Duplicate appointment selected';
  end if;

  -- Release expired checkout holds before testing availability.

  update public.private_course_bookings
  set
    status = 'expired'
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
    raise exception
      'Private course is already booked';
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
    raise exception
      'Private course is temporarily held';
  end if;

  select count(*)
  into v_valid_slot_count
  from public.private_course_availability a
  where a.course_id = p_course_id
    and a.is_active = true
    and a.id = any(p_slot_ids);

  if v_valid_slot_count <> v_slot_count then
    raise exception
      'One or more selected appointments are unavailable';
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
    set
      hold_expires_at =
        now() + interval '15 minutes'
    where id = v_booking_id;

    delete from public.private_booking_slots
    where booking_id = v_booking_id;
  end if;

  insert into public.private_booking_slots (
    booking_id,
    availability_slot_id,
    day_of_week,
    start_time
  )
  select
    v_booking_id,
    a.id,
    a.day_of_week,
    a.start_time
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


-- ------------------------------------------------------------
-- 9. Student can release own temporary hold
-- ------------------------------------------------------------

create or replace function public.release_private_course_hold(
  p_booking_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
to authenticated;
