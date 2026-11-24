\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','limited-admin@test.invalid'),
 ('a0000000-0000-4000-8000-000000000002','course-admin@test.invalid'),
 ('a0000000-0000-4000-8000-000000000003','capacity-one@test.invalid'),
 ('a0000000-0000-4000-8000-000000000004','capacity-two@test.invalid'),
 ('a0000000-0000-4000-8000-000000000005','rate-teacher@test.invalid'),
 ('a0000000-0000-4000-8000-000000000006','student-admin@test.invalid');

update public.profiles set role='admin',permissions=array['manage_support']
where id='a0000000-0000-4000-8000-000000000001';
update public.profiles set role='admin',permissions=array['manage_courses']
where id='a0000000-0000-4000-8000-000000000002';
update public.profiles set role='teacher'
where id='a0000000-0000-4000-8000-000000000005';
update public.profiles set role='admin',permissions=array['manage_students']
where id='a0000000-0000-4000-8000-000000000006';

insert into public.courses(id,title,is_published,is_free,price,course_type,max_students)
values
 ('a1000000-0000-4000-8000-000000000001','One seat',true,true,0,'group',1),
 ('a1000000-0000-4000-8000-000000000002','Chat limit',true,true,0,'group',5),
 ('a1000000-0000-4000-8000-000000000003','Reusable paid seat',true,false,10,'group',1);

insert into public.sections(id,course_id,title,order_index)
values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Original',1);

insert into public.enrollments(student_id,course_id)
values('a0000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001');

do $$ begin
  if public.course_registration_state('a1000000-0000-4000-8000-000000000001') <> 'full' then
    raise exception 'Full group remains open';
  end if;
  begin
    insert into public.enrollments(student_id,course_id)
    values('a0000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001');
    raise exception 'Group capacity exceeded';
  exception when check_violation then
    if sqlerrm <> 'GROUP_CAPACITY_REACHED' then raise; end if;
  end;
  insert into public.enrollments(student_id,course_id)
  values('a0000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001')
  on conflict(student_id,course_id) do nothing;
end $$;

-- Permanent progress rows must not make an expired paid subscription occupy a
-- seat forever. A new active subscription should occupy the released seat.
insert into public.enrollments(student_id,course_id)
values('a0000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003');
insert into public.subscriptions(student_id,course_id,duration_months,status,expires_at)
values(
  'a0000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000003',
  1,
  'expired',
  now() - interval '1 day'
);
do $$ begin
  if public.course_registration_state('a1000000-0000-4000-8000-000000000003') <> 'open' then
    raise exception 'Expired paid enrollment kept a group seat';
  end if;
end $$;
insert into public.enrollments(student_id,course_id)
values('a0000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000003');
insert into public.subscriptions(student_id,course_id,duration_months,status,expires_at)
values(
  'a0000000-0000-4000-8000-000000000004',
  'a1000000-0000-4000-8000-000000000003',
  1,
  'active',
  now() + interval '1 month'
);
do $$ begin
  if public.course_registration_state('a1000000-0000-4000-8000-000000000003') <> 'full' then
    raise exception 'Active paid enrollment did not occupy the group seat';
  end if;
  begin
    insert into public.enrollments(student_id,course_id)
    values('a0000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003')
    on conflict(student_id,course_id) do nothing;
    raise exception 'Expired paid enrollment reclaimed a full group seat';
  exception when check_violation then
    if sqlerrm <> 'GROUP_CAPACITY_REACHED' then raise; end if;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ begin
  if private.admin_has_permission('manage_courses') then raise exception 'Limited admin gained course permission'; end if;
  begin
    perform public.admin_create_section('a1000000-0000-4000-8000-000000000001','Injected');
    raise exception 'Limited admin changed course sections';
  exception when insufficient_privilege then null; end;
  if has_table_privilege(current_user,'public.orders','update') then raise exception 'Browser can update orders'; end if;
  if has_table_privilege(current_user,'public.subscriptions','update') then raise exception 'Browser can update subscriptions'; end if;
end $$;

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
select public.admin_create_section('a1000000-0000-4000-8000-000000000001','Allowed');
do $$ begin
  if not exists(select 1 from public.sections where course_id='a1000000-0000-4000-8000-000000000001' and title='Allowed') then
    raise exception 'Course admin lost section management';
  end if;
end $$;

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000006',true);
do $$ begin
  begin
    perform public.admin_extend_student_subscription(
      'a0000000-0000-4000-8000-000000000003',
      'a1000000-0000-4000-8000-000000000003',
      30
    );
    raise exception 'Student admin overfilled a group';
  exception when check_violation then
    if sqlerrm <> 'GROUP_CAPACITY_REACHED' then raise; end if;
  end;
end $$;

reset role;
update public.courses set max_students=2
where id='a1000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000006',true);
select public.admin_extend_student_subscription(
  'a0000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000003',
  30
);
do $$ begin
  if not exists(
    select 1 from public.subscriptions
    where student_id='a0000000-0000-4000-8000-000000000003'
      and course_id='a1000000-0000-4000-8000-000000000003'
      and status='active' and expires_at>now()
  ) then raise exception 'Student admin could not extend an available subscription'; end if;
end $$;

reset role;
insert into public.course_instructors(course_id,teacher_id)
values('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000005');
insert into public.enrollments(student_id,course_id)
values('a0000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
select public.start_conversation('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000005') as rate_chat \gset
select set_config('test.rate_chat', :'rate_chat', true);
insert into public.messages(conversation_id,sender_id,content)
select :'rate_chat',auth.uid(),'rate-'||n from generate_series(1,20) n;
do $$ begin
  begin
    insert into public.messages(conversation_id,sender_id,content)
    values(current_setting('test.rate_chat')::uuid,auth.uid(),'one-too-many');
    raise exception 'Chat minute limit bypassed';
  exception when raise_exception then
    if sqlerrm <> 'CHAT_RATE_LIMIT_MINUTE' then raise; end if;
  end;
end $$;

reset role;
do $$
declare f regprocedure;
begin
  foreach f in array array[
    'public.handle_new_user()'::regprocedure,
    'public.protect_admin_columns()'::regprocedure,
    'public.sync_coupon_redemption_from_order()'::regprocedure
  ] loop
    if has_function_privilege('anon',f,'execute')
       or has_function_privilege('authenticated',f,'execute') then
      raise exception 'Trigger function remains exposed: %',f;
    end if;
  end loop;
end $$;

rollback;
\echo 'Authorization, capacity and chat hardening regression checks passed.'
