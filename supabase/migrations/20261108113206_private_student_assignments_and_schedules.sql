-- Private homework has an explicit recipient; legacy shared work is preserved.
alter table public.assignments add column target_student_id uuid references public.profiles(id) on delete cascade;
-- Existing private homework with exactly one enrolled student has an unambiguous owner.
update public.assignments a set target_student_id=(select e.student_id from public.enrollments e where e.course_id=a.course_id limit 1)
from public.courses c where c.id=a.course_id and c.course_type='private' and (select count(*) from public.enrollments e where e.course_id=a.course_id)=1;
do $$ begin if exists(select 1 from assignments a join courses c on c.id=a.course_id where c.course_type='private' and a.target_student_id is null) then raise exception 'Legacy private homework needs a recipient before migration'; end if;end $$;
create index assignments_target_student_idx on public.assignments(target_student_id) where target_student_id is not null;
create function public.validate_assignment_audience() returns trigger language plpgsql set search_path=public as $$
declare kind text;
begin
 select course_type into kind from courses where id=new.course_id;
 if kind='private' and new.target_student_id is null then raise exception 'Choose a student for private homework'; end if;
 if kind='group' and new.target_student_id is not null then raise exception 'Group homework applies to the whole course'; end if;
 if new.target_student_id is not null and not exists(select 1 from enrollments where course_id=new.course_id and student_id=new.target_student_id) then raise exception 'Student is not enrolled in this course'; end if;
 return new;
end $$;
create trigger assignment_audience before insert or update of course_id,target_student_id on public.assignments for each row execute function public.validate_assignment_audience();
create function public.assignment_can_view_assignment_text(p_assignment_id text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from assignments a where a.id::text=p_assignment_id and
 (assignment_can_manage_course_text(a.course_id::text) or (a.is_published and (a.target_student_id is null or a.target_student_id=auth.uid()) and exists(select 1 from enrollments e where e.course_id=a.course_id and e.student_id=auth.uid()))));
$$;
revoke all on function public.assignment_can_view_assignment_text(text) from public,anon;
grant execute on function public.assignment_can_view_assignment_text(text) to authenticated,service_role;
create policy assignment_recipient_guard on public.assignments as restrictive for select to authenticated using(public.assignment_can_view_assignment_text(id::text));
create policy assignment_resource_recipient_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'assignment-files' or public.assignment_can_view_assignment_text(split_part(name,'/',3)));
create policy assignment_upload_recipient_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'assignment-files' or public.assignment_can_view_assignment_text(split_part(name,'/',3)));
do $$ declare def text; needle text:='if not found or not a.is_published then'; begin
 def:=pg_get_functiondef('public.write_assignment_submission(uuid,uuid,jsonb,boolean)'::regprocedure);
 if position(needle in def)=0 then raise exception 'Unexpected assignment writer';end if;
 execute replace(def,needle,'if not found or not a.is_published or (a.target_student_id is not null and a.target_student_id is distinct from p_student_id) then');
end $$;

-- Multiple students may purchase a private course, each with their own pair.
drop index public.private_course_one_confirmed_idx;
drop index public.private_course_one_pending_idx;
create unique index private_student_confirmed_idx on public.private_course_bookings(course_id,student_id) where status='confirmed';
create unique index private_student_pending_idx on public.private_course_bookings(course_id,student_id) where status='pending_payment';
create function public.available_private_slots(p_course_id uuid)
returns table(id uuid,day_of_week smallint,start_time time,end_time time)
language sql stable security definer set search_path=public as $$
 select a.id,a.day_of_week,a.start_time,a.end_time from private_course_availability a join courses c on c.id=a.course_id
 where a.course_id=p_course_id and c.is_published and c.course_type='private' and a.is_active
 and not exists(select 1 from private_booking_slots s join private_course_bookings b on b.id=s.booking_id
 where (b.status='confirmed' or (b.status='pending_payment' and b.hold_expires_at>now()))
 and (b.student_id is distinct from auth.uid() or b.status='confirmed' or b.course_id<>p_course_id)
 and s.day_of_week=a.day_of_week and s.start_time<a.end_time and s.end_time>a.start_time
 and (b.course_id=p_course_id or exists(select 1 from course_instructors x join course_instructors y on x.teacher_id=y.teacher_id where x.course_id=b.course_id and y.course_id=p_course_id)));
$$;
revoke all on function public.available_private_slots(uuid) from public,anon;
grant execute on function public.available_private_slots(uuid) to authenticated,service_role;
create or replace function public.course_registration_state(p_course_id uuid) returns text language plpgsql stable security definer set search_path=public as $$
declare c courses%rowtype;
begin
 select * into c from courses where id=p_course_id;
 if not found or not c.is_published then return 'unavailable'; end if;
 if not c.registration_open then return 'closed';end if;
 if c.course_type='group' then return 'open';end if;
 if (select count(*) from available_private_slots(p_course_id))>=2 then return 'available';end if;
 return 'booked';
end $$;

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
     or v_slot_count <> 2 then
    raise exception 'Exactly two appointments are required';
  end if;

  select count(distinct slot_id)
  into v_unique_slot_count
  from unnest(p_slot_ids) as selected(slot_id);

  if v_unique_slot_count <> 2 then
    raise exception 'Two different appointments are required';
  end if;

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
      and b.student_id = v_user_id
  ) then
    raise exception 'Course already booked';
  end if;

  -- Same teacher's courses share the lock before testing overlaps.
  perform 1 from public.profiles p where p.id in (select teacher_id from public.course_instructors where course_id=p_course_id) order by p.id for update;
  if exists(select 1 from public.private_course_availability x join public.private_course_availability y on x.id<y.id
    where x.id=any(p_slot_ids) and y.id=any(p_slot_ids) and x.day_of_week=y.day_of_week and x.start_time<y.end_time and x.end_time>y.start_time) then raise exception 'Invalid overlapping appointments';end if;
  select count(*)
  into v_valid_slot_count
  from public.available_private_slots(p_course_id) a where a.id=any(p_slot_ids);

  if v_valid_slot_count <> 2 then
    raise exception 'Invalid availability selection';
  end if;

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

  delete from public.private_booking_slots
  where booking_id = v_booking_id;

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

