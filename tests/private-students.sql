\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f0000000-0000-4000-8000-000000000001','private-teacher@test.invalid');
update profiles set role='teacher' where id='f0000000-0000-4000-8000-000000000001';
insert into courses(id,title,price,course_type,is_published,registration_open) values('f1000000-0000-4000-8000-000000000001','Private five student test',25,'private',true,true),('f1000000-0000-4000-8000-000000000002','Group homework',25,'group',true,true);
insert into course_instructors(course_id,teacher_id) values('f1000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001');
do $$ declare student uuid; slots uuid[]; booking uuid; aid uuid; i integer; result jsonb;
begin
 for i in 1..5 loop
  student:=('f2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  insert into auth.users(id,email) values(student,'private-'||i||'@test.invalid');
  insert into enrollments(course_id,student_id) values('f1000000-0000-4000-8000-000000000001',student),('f1000000-0000-4000-8000-000000000002',student);
  insert into private_course_availability(course_id,day_of_week,start_time,end_time,is_active) values('f1000000-0000-4000-8000-000000000001',i,'10:00','11:00',true),('f1000000-0000-4000-8000-000000000001',i,'14:00','15:00',true);
  select array_agg(id) into slots from private_course_availability where course_id='f1000000-0000-4000-8000-000000000001' and day_of_week=i;
  perform set_config('request.jwt.claim.sub',student::text,true);
  booking:=reserve_private_course('f1000000-0000-4000-8000-000000000001',slots);
  update private_course_bookings set status='confirmed',hold_expires_at=null where id=booking;
  insert into assignments(course_id,title,target_student_id) values('f1000000-0000-4000-8000-000000000001','Personal homework '||i,student) returning id into aid;
  if not assignment_can_view_assignment_text(aid::text) then raise exception 'Own homework invisible';end if;
  perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
  if not assignment_can_view_assignment_text(aid::text) then raise exception 'Teacher cannot read';end if;
  perform set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000099',true);
  if assignment_can_view_assignment_text(aid::text) then raise exception 'Foreign student sees private homework';end if;
 end loop;
 if (select count(*) from private_course_bookings where course_id='f1000000-0000-4000-8000-000000000001' and status='confirmed')<>5 then raise exception 'Multiple students not supported';end if;

 begin insert into assignments(course_id,title) values('f1000000-0000-4000-8000-000000000001','Missing recipient');raise exception 'Unassigned private work accepted';exception when others then if sqlerrm<>'Choose a student for private homework' then raise;end if;end;
 begin insert into assignments(course_id,title,target_student_id) values('f1000000-0000-4000-8000-000000000002','Wrong group recipient',student);raise exception 'Individual group work accepted';exception when others then if sqlerrm<>'Group homework applies to the whole course' then raise;end if;end;
 select id into aid from assignments where title='Personal homework 1';
 begin perform write_assignment_submission(aid,'f2000000-0000-4000-8000-000000000002','{"text":"foreign answer"}',true);raise exception 'Foreign student submitted private homework';exception when others then if sqlerrm<>'Assignment not found' then raise;end if;end;
 select array_agg(id) into slots from private_course_availability where course_id='f1000000-0000-4000-8000-000000000001' and day_of_week=1;
 perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
 begin perform reserve_private_course('f1000000-0000-4000-8000-000000000001',slots);raise exception 'Occupied slot booked';exception when others then if sqlerrm not in ('Course already booked','Invalid availability selection') then raise;end if;end;
 insert into assignments(course_id,title) values('f1000000-0000-4000-8000-000000000002','Group assignment') returning id into aid;
 for i in 1..5 loop
  student:=('f2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  perform set_config('request.jwt.claim.sub',student::text,true);
  if not assignment_can_view_assignment_text(aid::text) then raise exception 'Group work hidden';end if;
 end loop;
end $$;

insert into storage.objects(bucket_id,name) select 'assignment-files','resources/'||course_id||'/'||id||'/notes.pdf' from assignments where title in ('Personal homework 1','Personal homework 2','Group assignment');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from assignments where course_id='f1000000-0000-4000-8000-000000000001')<>1 then raise exception 'Private assignment RLS leaked';end if;

 if (select count(*) from storage.objects where bucket_id='assignment-files')<>2 then raise exception 'Private resources leaked or group resource hidden';end if;
end $$;
-- Use a known assignment ID through a postgres-set setting to test foreign upload directly.
reset role;
select set_config('test.private_assignment',(select id::text from assignments where title='Personal homework 1'),true);
set local role authenticated;
do $$ begin
 begin insert into storage.objects(bucket_id,name) values('assignment-files','submissions/f1000000-0000-4000-8000-000000000001/'||current_setting('test.private_assignment')||'/f2000000-0000-4000-8000-000000000002/foreign.pdf');raise exception 'Foreign homework upload allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
