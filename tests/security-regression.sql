\set ON_ERROR_STOP on
-- Entire fixture is rolled back, even though the database is disposable.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','one@example.test','{"username":"Student.One"}'),
 ('00000000-0000-4000-8000-000000000002','two@example.test','{"username":"Student.Two"}'),
 ('00000000-0000-4000-8000-000000000003','teacher@example.test','{}');
update public.profiles set role='teacher' where id='00000000-0000-4000-8000-000000000003';
insert into public.courses(id,title,is_published,is_free,price,course_type) values
 ('10000000-0000-4000-8000-000000000001','Paid',true,false,20,'group'),
 ('10000000-0000-4000-8000-000000000002','Draft',false,false,20,'group');
insert into public.sections(id,course_id,title,order_index) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','One',1),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Draft',1);
insert into public.lessons(id,section_id,title,order_index,is_free_preview,video_provider,mux_playback_id,content_url) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Paid',1,false,'mux','private-playback','https://example.test/private'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Preview',2,true,'mux','preview-playback',null),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Draft Preview',1,true,'mux','draft-playback',null);
insert into public.course_instructors(course_id,teacher_id) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
insert into public.subscriptions(student_id,course_id,duration_months,amount,currency,status,expires_at) values
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,20,'USD','active',now()+interval '1 month'),
 ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1,20,'USD','active',now()-interval '1 day');
insert into storage.objects(bucket_id,name,owner_id) values
 ('images','teachers/one.jpg','00000000-0000-4000-8000-000000000001'),
 ('images','teachers/two.jpg','00000000-0000-4000-8000-000000000002');

set local role anon;
do $$ begin
  if (select count(*) from public.get_course_lesson_catalog('10000000-0000-4000-8000-000000000001')) <> 2 then
    raise exception 'Public curriculum metadata missing'; end if;
  if exists (select 1 from public.get_course_lesson_catalog('10000000-0000-4000-8000-000000000001')
    where content_url is not null or mux_playback_id is not null or youtube_video_id is not null
      or bunny_video_id is not null or bunny_library_id is not null or mux_asset_id is not null) then
    raise exception 'Public catalog leaks content'; end if;
  if (select count(*) from public.lessons) <> 1 then raise exception 'Anon must see published previews only'; end if;
  if exists (select 1 from public.get_course_lesson_catalog('10000000-0000-4000-8000-000000000002')) then
    raise exception 'Draft curriculum exposed'; end if;
  if (select lesson_count from public.get_course_lesson_counts(array['10000000-0000-4000-8000-000000000001'::uuid])) <> 2 then
    raise exception 'Public lesson counts are incomplete'; end if;
  if public.is_username_available('student.ONE') then raise exception 'Username lookup must be case insensitive'; end if;
  if public.is_username_available('admin') then raise exception 'Reserved username allowed'; end if;
  if has_function_privilege(current_user,'public.get_email_by_username(text)','execute') then
    raise exception 'Anon can resolve email'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.lessons) <> 2 then raise exception 'Active subscriber cannot read paid lesson'; end if;
  if has_table_privilege(current_user,'public.bunny_video_uploads','insert') then raise exception 'Client can forge Bunny ownership'; end if;
  if has_function_privilege(current_user,'public.get_email_by_username(text)','execute') then raise exception 'Student can resolve email'; end if;
end $$;
-- RLS must prevent a caller from deleting someone else's image.
delete from storage.objects where name='teachers/two.jpg';
update public.profiles set username='Student.Renamed' where id=auth.uid();
do $$ begin
  begin
    update public.profiles set username='ADMIN' where id=auth.uid();
    raise exception 'Reserved username update succeeded';
  exception when check_violation then null; end;
  begin
    update public.profiles set username='student.two' where id=auth.uid();
    raise exception 'Duplicate username update succeeded';
  exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.lessons) <> 1 then raise exception 'Expired subscriber can read paid lesson'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
  if (select count(*) from public.lessons) <> 2 then raise exception 'Assigned teacher lost content access'; end if;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from storage.objects where name='teachers/two.jpg') then raise exception 'Foreign image deleted'; end if;
  if (select username from public.profiles where id='00000000-0000-4000-8000-000000000001') <> 'Student.Renamed' then raise exception 'Username update not saved'; end if;
end $$;
set local role service_role;
do $$ begin
  if public.get_email_by_username('STUDENT.RENAMED') <> 'one@example.test' then raise exception 'Backend username login lookup failed'; end if;
end $$;
reset role;
rollback;
\echo 'Database security regression checks passed.'
