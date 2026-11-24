-- Permission-aware database authorization, atomic group capacity and chat throttling.

-- ---------------------------------------------------------------------------
-- Admin permissions must be enforced by RLS/RPC, not only by Next.js actions.
-- Keep the helper outside the exposed public schema; authenticated callers need
-- EXECUTE so PostgreSQL can evaluate policies, but PostgREST cannot expose it.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.admin_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role::text = 'admin'
      and (
        p.is_super_admin = true
        or p_permission = any(coalesce(p.permissions, '{}'::text[]))
      )
  );
$$;

create or replace function private.admin_has_any_permission(p_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role::text = 'admin'
      and (
        p.is_super_admin = true
        or coalesce(p.permissions, '{}'::text[]) && coalesce(p_permissions, '{}'::text[])
      )
  );
$$;

revoke all on function private.admin_has_permission(text) from public, anon;
revoke all on function private.admin_has_any_permission(text[]) from public, anon;
grant execute on function private.admin_has_permission(text) to authenticated, service_role;
grant execute on function private.admin_has_any_permission(text[]) to authenticated, service_role;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Permissioned admins view profiles"
on public.profiles for select to authenticated
using (private.admin_has_any_permission(array[
  'manage_students', 'manage_teachers', 'manage_courses', 'moderate_messages', 'manage_support'
]::text[]));

drop policy if exists "Admins can manage course coupons" on public.course_coupons;
create policy "Coupon admins manage course coupons"
on public.course_coupons for all to authenticated
using (private.admin_has_permission('manage_coupons'))
with check (private.admin_has_permission('manage_coupons'));

drop policy if exists "Admins manage course instructors" on public.course_instructors;
create policy "Teacher admins manage course instructors"
on public.course_instructors for all to authenticated
using (private.admin_has_any_permission(array['manage_teachers', 'manage_courses']::text[]))
with check (private.admin_has_any_permission(array['manage_teachers', 'manage_courses']::text[]));

drop policy if exists "Admins manage course offers" on public.course_offers;
create policy "Course admins manage course offers"
on public.course_offers for all to authenticated
using (private.admin_has_permission('manage_courses'))
with check (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can view all enrollments" on public.enrollments;
create policy "Student admins view all enrollments"
on public.enrollments for select to authenticated
using (private.admin_has_permission('manage_students'));

drop policy if exists "Admins can delete enrollments" on public.enrollments;
create policy "Student admins delete enrollments"
on public.enrollments for delete to authenticated
using (private.admin_has_permission('manage_students'));

-- Enrollment creation is a payment/free-enrollment backend responsibility.
drop policy if exists "Admins can insert enrollments" on public.enrollments;
revoke insert on public.enrollments from authenticated;

drop policy if exists "Admins can view all lesson progress" on public.lesson_progress;
create policy "Student admins view lesson progress"
on public.lesson_progress for select to authenticated
using (private.admin_has_permission('manage_students'));

drop policy if exists "Admins can delete lesson progress" on public.lesson_progress;
create policy "Student admins delete lesson progress"
on public.lesson_progress for delete to authenticated
using (private.admin_has_permission('manage_students'));

drop policy if exists "Admins can manage lessons" on public.lessons;
create policy "Course admins manage lessons"
on public.lessons for all to authenticated
using (private.admin_has_permission('manage_courses'))
with check (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can view all sections" on public.sections;
create policy "Course admins view all sections"
on public.sections for select to authenticated
using (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can insert sections" on public.sections;
create policy "Course admins insert sections"
on public.sections for insert to authenticated
with check (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can update sections" on public.sections;
create policy "Course admins update sections"
on public.sections for update to authenticated
using (private.admin_has_permission('manage_courses'))
with check (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can delete sections" on public.sections;
create policy "Course admins delete sections"
on public.sections for delete to authenticated
using (private.admin_has_permission('manage_courses'));

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Payment admins view all orders"
on public.orders for select to authenticated
using (private.admin_has_permission('view_orders'));

-- Status and financial snapshots are changed only by verified backend flows.
drop policy if exists "Admins can update orders" on public.orders;
revoke update on public.orders from authenticated;

drop policy if exists "Admins can manage subscriptions" on public.subscriptions;
create policy "Payment admins view subscriptions"
on public.subscriptions for select to authenticated
using (private.admin_has_any_permission(array['view_orders', 'manage_students']::text[]));
revoke insert, update, delete on public.subscriptions from authenticated;

drop policy if exists "users and admins delete images" on storage.objects;
create policy "Owners and media admins delete images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'images'
  and (
    owner_id = (select auth.uid())::text
    or private.admin_has_any_permission(array['manage_courses', 'manage_teachers']::text[])
  )
);

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
using (
  (select auth.uid()) = student_id
  or (select auth.uid()) = teacher_id
  or private.admin_has_permission('moderate_messages')
);

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        c.student_id = (select auth.uid())
        or c.teacher_id = (select auth.uid())
        or private.admin_has_permission('moderate_messages')
      )
  )
);

drop policy if exists "chat files select" on storage.objects;
create policy "chat files select" on storage.objects for select to authenticated
using (
  bucket_id = 'chat-files'
  and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (
        c.student_id = (select auth.uid())
        or c.teacher_id = (select auth.uid())
        or private.admin_has_permission('moderate_messages')
      )
  )
);

drop policy if exists chat_channel_read on realtime.messages;
create policy chat_channel_read on realtime.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where 'messages-' || c.id::text = (select realtime.topic())
      and (
        c.student_id = (select auth.uid())
        or c.teacher_id = (select auth.uid())
        or private.admin_has_permission('moderate_messages')
      )
  )
);

-- These RPCs are intentionally exposed to authenticated course managers. The
-- permission check lives in the definer function as well as the server action.
create or replace function public.admin_create_section(p_course_id uuid, p_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order_index integer; v_id uuid;
begin
  if not private.admin_has_permission('manage_courses') then
    raise insufficient_privilege using message = 'Course management permission required';
  end if;
  if nullif(trim(p_title), '') is null then raise exception 'Section title is required'; end if;
  select coalesce(max(s.order_index), 0) + 1 into v_order_index
  from public.sections s where s.course_id = p_course_id;
  insert into public.sections(course_id, title, order_index)
  values(p_course_id, trim(p_title), v_order_index) returning id into v_id;
  return jsonb_build_object('id', v_id, 'title', trim(p_title), 'order_index', v_order_index);
end;
$$;

create or replace function public.admin_update_section(
  p_section_id uuid, p_course_id uuid, p_title text, p_order_index integer
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_has_permission('manage_courses') then
    raise insufficient_privilege using message = 'Course management permission required';
  end if;
  if nullif(trim(p_title), '') is null then raise exception 'Section title is required'; end if;
  if p_order_index < 1 then raise exception 'Section order must be 1 or greater'; end if;
  update public.sections set title = trim(p_title), order_index = p_order_index
  where id = p_section_id and course_id = p_course_id;
end;
$$;

create or replace function public.admin_delete_section(p_section_id uuid, p_course_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_has_permission('manage_courses') then
    raise insufficient_privilege using message = 'Course management permission required';
  end if;
  delete from public.sections where id = p_section_id and course_id = p_course_id;
end;
$$;

revoke all on function public.admin_create_section(uuid, text) from public, anon;
revoke all on function public.admin_update_section(uuid, uuid, text, integer) from public, anon;
revoke all on function public.admin_delete_section(uuid, uuid) from public, anon;
grant execute on function public.admin_create_section(uuid, text) to authenticated, service_role;
grant execute on function public.admin_update_section(uuid, uuid, text, integer) to authenticated, service_role;
grant execute on function public.admin_delete_section(uuid, uuid) to authenticated, service_role;

-- Trigger-only functions are not public RPC endpoints. Some protections were
-- created manually on the hosted database, so resolve them conditionally.
do $$
declare
  v_signature text;
  v_function regprocedure;
begin
  foreach v_signature in array array[
    'public.handle_new_user()',
    'public.protect_admin_columns()',
    'public.protect_profile_privileged_columns()',
    'public.prevent_role_change()',
    'public.rls_auto_enable()',
    'public.sync_coupon_redemption_from_order()'
  ] loop
    v_function := to_regprocedure(v_signature);
    if v_function is not null then
      execute format(
        'revoke all on function %s from public, anon, authenticated',
        v_function
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Group capacity. Existing group courses receive a conservative default, while
-- a legacy offer-specific capacity is retained where it exists.
-- ---------------------------------------------------------------------------
alter table public.courses
  add column if not exists max_students integer;

update public.courses c
set max_students = coalesce(
  (
    select o.max_students
    from public.course_offers o
    where o.course_id = c.id and o.type::text = 'group'
    limit 1
  ),
  30
)
where c.course_type::text = 'group'
  and c.max_students is null;

update public.courses
set max_students = null
where course_type::text = 'private';

-- A static default would also be applied to private courses. Normalize the
-- value according to the selected course type before the check constraint is
-- evaluated, including for older clients that do not yet send this column.
alter table public.courses
  alter column max_students drop default;

create or replace function private.normalize_course_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.course_type::text = 'group' then
    new.max_students := coalesce(new.max_students, 30);
  else
    new.max_students := null;
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_course_capacity() from public, anon, authenticated;
drop trigger if exists normalize_course_capacity on public.courses;
create trigger normalize_course_capacity
before insert or update of course_type, max_students on public.courses
for each row execute function private.normalize_course_capacity();

alter table public.courses
  drop constraint if exists courses_group_capacity_check;
alter table public.courses
  add constraint courses_group_capacity_check check (
    (course_type::text = 'group' and max_students between 1 and 500)
    or (course_type::text = 'private' and max_students is null)
  );

create or replace function private.enforce_group_course_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_is_free boolean;
  v_capacity integer;
  v_enrolled integer;
begin
  -- Serialize all first-time enrollment decisions for the same course.
  select c.course_type::text, c.is_free, c.max_students
  into v_type, v_is_free, v_capacity
  from public.courses c
  where c.id = new.course_id
  for update;

  if not found then
    raise foreign_key_violation using message = 'COURSE_NOT_FOUND';
  end if;

  if v_type <> 'group' then
    return new;
  end if;

  -- An already active paid subscription (or any free enrollment) already
  -- occupies its seat, so extending it does not consume another one. An
  -- expired paid enrollment must compete for a newly available seat.
  if exists (
    select 1 from public.enrollments e
    where e.course_id = new.course_id and e.student_id = new.student_id
  ) and (
    v_is_free
    or exists (
      select 1 from public.subscriptions s
      where s.course_id = new.course_id
        and s.student_id = new.student_id
        and s.status = 'active'
        and (s.expires_at is null or s.expires_at > now())
    )
  ) then
    return new;
  end if;

  if v_capacity is null then
    raise check_violation using message = 'GROUP_CAPACITY_NOT_CONFIGURED';
  end if;

  select count(*)::integer into v_enrolled
  from public.enrollments e
  where e.course_id = new.course_id
    and (
      v_is_free
      or exists (
        select 1
        from public.subscriptions s
        where s.student_id = e.student_id
          and s.course_id = e.course_id
          and s.status = 'active'
          and (s.expires_at is null or s.expires_at > now())
      )
    );

  if v_enrolled >= v_capacity then
    raise check_violation using message = 'GROUP_CAPACITY_REACHED';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_group_course_capacity() from public, anon, authenticated;
drop trigger if exists enforce_group_course_capacity on public.enrollments;
create trigger enforce_group_course_capacity
before insert on public.enrollments
for each row execute function private.enforce_group_course_capacity();

create or replace function public.course_registration_state(p_course_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_course public.courses%rowtype;
begin
  select * into v_course from public.courses where id = p_course_id;
  if not found or not v_course.is_published then return 'unavailable'; end if;
  if not v_course.registration_open then return 'closed'; end if;
  if v_course.course_type::text = 'group' then
    if (
      select count(*)
      from public.enrollments e
      where e.course_id = p_course_id
        and (
          v_course.is_free
          or exists (
            select 1
            from public.subscriptions s
            where s.student_id = e.student_id
              and s.course_id = e.course_id
              and s.status = 'active'
              and (s.expires_at is null or s.expires_at > now())
          )
        )
    )
       >= v_course.max_students then
      return 'full';
    end if;
    return 'open';
  end if;
  if (select count(*) from public.available_private_slots(p_course_id)) >= 2 then
    return 'available';
  end if;
  return 'booked';
end;
$$;

revoke all on function public.course_registration_state(uuid) from public;
grant execute on function public.course_registration_state(uuid) to anon, authenticated, service_role;

create or replace function public.admin_extend_student_subscription(
  p_student_id uuid,
  p_course_id uuid,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_course public.courses%rowtype;
  v_base timestamptz;
  v_enrolled integer;
begin
  if not private.admin_has_permission('manage_students') then
    raise insufficient_privilege using message = 'Student management permission required';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise check_violation using message = 'SUBSCRIPTION_EXTENSION_DAYS_INVALID';
  end if;

  select * into v_course
  from public.courses c
  where c.id = p_course_id
  for update;
  if not found then
    raise no_data_found using message = 'COURSE_NOT_FOUND';
  end if;

  select * into v_subscription
  from public.subscriptions s
  where s.student_id = p_student_id and s.course_id = p_course_id
  for update;
  if not found then
    raise no_data_found using message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if v_course.course_type::text = 'group'
     and not v_course.is_free
     and not (
       v_subscription.status = 'active'
       and (v_subscription.expires_at is null or v_subscription.expires_at > now())
     ) then
    select count(*)::integer into v_enrolled
    from public.enrollments e
    where e.course_id = p_course_id
      and exists (
        select 1 from public.subscriptions s
        where s.student_id = e.student_id
          and s.course_id = e.course_id
          and s.status = 'active'
          and (s.expires_at is null or s.expires_at > now())
      );
    if v_enrolled >= v_course.max_students then
      raise check_violation using message = 'GROUP_CAPACITY_REACHED';
    end if;
  end if;

  v_base := case
    when v_subscription.expires_at is not null
      and v_subscription.expires_at > now()
      then v_subscription.expires_at
    else now()
  end;

  update public.subscriptions
  set expires_at = v_base + make_interval(days => p_days),
      status = 'active',
      updated_at = now()
  where id = v_subscription.id;
end;
$$;

revoke all on function public.admin_extend_student_subscription(uuid, uuid, integer) from public, anon;
grant execute on function public.admin_extend_student_subscription(uuid, uuid, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Chat rate limiting. This is database-enforced so direct Data API calls cannot
-- bypass it. The advisory lock also covers concurrent requests from many tabs.
-- ---------------------------------------------------------------------------
create index if not exists messages_sender_created_idx
on public.messages(sender_id, created_at desc);

create or replace function private.enforce_chat_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
begin
  if v_user is null or new.sender_id is distinct from v_user then
    raise insufficient_privilege using message = 'CHAT_SENDER_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('chat-rate:' || v_user::text, 0));

  if (
    select count(*) from public.messages m
    where m.sender_id = v_user and m.created_at > v_now - interval '1 minute'
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'CHAT_RATE_LIMIT_MINUTE';
  end if;

  if (
    select count(*) from public.messages m
    where m.sender_id = v_user and m.created_at > v_now - interval '24 hours'
  ) >= 500 then
    raise exception using errcode = 'P0001', message = 'CHAT_RATE_LIMIT_DAY';
  end if;

  -- Do not let callers backdate messages to evade the counters.
  new.created_at := v_now;
  return new;
end;
$$;

revoke all on function private.enforce_chat_message_rate_limit() from public, anon, authenticated;
drop trigger if exists enforce_chat_message_rate_limit on public.messages;
create trigger enforce_chat_message_rate_limit
before insert on public.messages
for each row execute function private.enforce_chat_message_rate_limit();
