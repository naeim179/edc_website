\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('065c4c24-1738-4e68-8690-c12c65a68001','zero-price-first@example.test'),
 ('065c4c24-1738-4e68-8690-c12c65a68002','zero-price-second@example.test');
insert into public.courses(id,title,price,course_type,is_published,registration_open,is_free,discount_type,discount_value,max_students) values
 ('cf1ea655-3ae2-4310-a221-fe280e9ed001','Zero group',25,'group',true,true,false,'percentage',100,1),
 ('cf1ea655-3ae2-4310-a221-fe280e9ed002','Free group',0,'group',true,true,true,null,0,1),
 ('cf1ea655-3ae2-4310-a221-fe280e9ed003','Regular price',25,'group',true,true,false,'fixed',24,1),
 ('cf1ea655-3ae2-4310-a221-fe280e9ed004','Zero private',25,'private',true,true,false,'fixed',25,null);
insert into public.sections(id,course_id,title,order_index) values
 ('cf1ea655-3ae2-4310-a221-fe280e9ed101','cf1ea655-3ae2-4310-a221-fe280e9ed001','Lessons',1);
insert into public.lessons(id,section_id,title,order_index,is_free_preview) values
 ('cf1ea655-3ae2-4310-a221-fe280e9ed201','cf1ea655-3ae2-4310-a221-fe280e9ed101','Locked course lesson',1,false);

set local role service_role;
do $$
declare
 student uuid := '065c4c24-1738-4e68-8690-c12c65a68001';
 other_student uuid := '065c4c24-1738-4e68-8690-c12c65a68002';
 discounted uuid := 'cf1ea655-3ae2-4310-a221-fe280e9ed001';
 expiry timestamptz;
begin
 perform public.activate_zero_price_course(student,discounted,3);
 select expires_at into expiry from public.subscriptions where course_id=discounted and student_id=student;
 if expiry is distinct from public.add_calendar_months_clamped(now(),3) then raise exception 'Wrong zero-price subscription duration'; end if;
 perform public.activate_zero_price_course(student,discounted,1);
 if not exists(select 1 from public.subscriptions where course_id=discounted and student_id=student and duration_months=3 and expires_at=expiry and status='active' and amount=0 and not auto_renew) then raise exception 'Retry changed subscription'; end if;
 if exists(select 1 from public.orders where course_id=discounted) then raise exception 'Free activation created a payment'; end if;
 begin perform public.activate_zero_price_course(other_student,discounted,1); raise exception 'Group capacity ignored'; exception when check_violation then if sqlerrm <> 'GROUP_CAPACITY_REACHED' then raise; end if; end;
 perform public.activate_zero_price_course(student,'cf1ea655-3ae2-4310-a221-fe280e9ed002',null);
 if exists(select 1 from public.subscriptions where course_id='cf1ea655-3ae2-4310-a221-fe280e9ed002') then raise exception 'Free course became a subscription'; end if;
 begin perform public.activate_zero_price_course(student,'cf1ea655-3ae2-4310-a221-fe280e9ed003',1); raise exception 'Positive price was bypassed'; exception when others then if sqlerrm <> 'ZERO_PRICE_REQUIRED' then raise; end if; end;
 begin perform public.activate_zero_price_course(student,'cf1ea655-3ae2-4310-a221-fe280e9ed004',1); raise exception 'Private schedules bypassed'; exception when others then if sqlerrm <> 'ZERO_PRICE_BOOKING_REQUIRED' then raise; end if; end;
 insert into public.orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,auto_renew_requested)
 values(other_student,discounted,25,'USD','pending',1,'paytabs','manual',false);
 begin perform public.activate_zero_price_course(other_student,discounted,1); raise exception 'Open gateway order ignored'; exception when others then if sqlerrm <> 'ZERO_PRICE_PENDING_PAYMENT' then raise; end if; end;
end $$;
reset role;

insert into public.private_course_availability(course_id,day_of_week,start_time,end_time,is_active) values
 ('cf1ea655-3ae2-4310-a221-fe280e9ed004',1,'10:00','11:00',true),
 ('cf1ea655-3ae2-4310-a221-fe280e9ed004',3,'10:00','11:00',true);
select set_config('request.jwt.claim.sub','065c4c24-1738-4e68-8690-c12c65a68001',true);
select public.reserve_private_course('cf1ea655-3ae2-4310-a221-fe280e9ed004',
 (select array_agg(id) from public.private_course_availability where course_id='cf1ea655-3ae2-4310-a221-fe280e9ed004')) as booking_id \gset
set local role service_role;
select public.activate_zero_price_course('065c4c24-1738-4e68-8690-c12c65a68001','cf1ea655-3ae2-4310-a221-fe280e9ed004',1,:'booking_id');
do $$ begin
 if not exists(select 1 from public.private_course_bookings where course_id='cf1ea655-3ae2-4310-a221-fe280e9ed004' and status='confirmed')
 or not exists(select 1 from public.subscriptions where course_id='cf1ea655-3ae2-4310-a221-fe280e9ed004' and duration_months=1 and amount=0 and not auto_renew) then
  raise exception 'Zero-price private booking and subscription did not activate together';
 end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','065c4c24-1738-4e68-8690-c12c65a68001',true);
do $$
declare e uuid; timestamp_before timestamptz;
begin
 if has_function_privilege(current_user,'public.activate_zero_price_course(uuid,uuid,integer,uuid)','execute') then raise exception 'Privileged free activation exposed to clients'; end if;
 select id into strict e from public.enrollments where course_id='cf1ea655-3ae2-4310-a221-fe280e9ed001';
 if not exists(select 1 from public.lessons where id='cf1ea655-3ae2-4310-a221-fe280e9ed201') then raise exception 'Zero-price subscription did not unlock lessons'; end if;
 perform public.complete_lesson_progress(e,'cf1ea655-3ae2-4310-a221-fe280e9ed201');
 select completed_at into strict timestamp_before from public.lesson_progress where enrollment_id=e;
 perform public.complete_lesson_progress(e,'cf1ea655-3ae2-4310-a221-fe280e9ed201');
 if not exists(select 1 from public.lesson_progress where enrollment_id=e and is_completed and completed_at=timestamp_before) then raise exception 'Completion not idempotent'; end if;
end $$;
rollback;
\echo 'Zero-price access and atomic progress checks passed.'
