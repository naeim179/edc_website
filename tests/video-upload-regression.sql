begin;
insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','video-student@test.invalid'),
 ('a0000000-0000-4000-8000-000000000002','video-teacher@test.invalid'),
 ('a0000000-0000-4000-8000-000000000003','video-admin@test.invalid'),
 ('a0000000-0000-4000-8000-000000000004','video-limited@test.invalid');
update public.profiles set role='teacher' where id='a0000000-0000-4000-8000-000000000002';
update public.profiles set role='admin',is_super_admin=true where id='a0000000-0000-4000-8000-000000000003';
update public.profiles set role='admin',permissions=array['view_orders'] where id='a0000000-0000-4000-8000-000000000004';
insert into public.courses(id,title,is_published,is_free,course_type) values('a1000000-0000-4000-8000-000000000001','Upload QA',false,true,'group'),('a1000000-0000-4000-8000-000000000002','Other Upload QA',false,true,'group');
insert into public.sections(id,course_id,title,order_index) values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Uploads',1),('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Other uploads',1);
insert into public.course_instructors(course_id,teacher_id) values('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002');

set local role anon;
do $$ begin
 if has_table_privilege(current_user,'public.lesson_video_uploads','select') or has_function_privilege(current_user,'public.reserve_lesson_video_upload(uuid,text,bigint,text)','execute') then raise exception 'Anonymous upload access';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');raise exception 'Student prepared upload';exception when insufficient_privilege then null;end;
 if has_table_privilege(current_user,'public.lesson_video_uploads','select') or has_table_privilege(current_user,'public.lesson_video_uploads','update')
  or has_function_privilege(current_user,'public.claim_stale_video_upload(uuid)','execute') or has_function_privilege(current_user,'public.list_stale_video_uploads()','execute') then raise exception 'Private upload registry exposed';end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
do $$ begin begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');raise exception 'Limited admin prepared upload';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare r uuid;begin
 begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000002','bunny',4,'video/mp4');raise exception 'Wrong course upload';exception when insufficient_privilege then null;end;
 begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',94371841,'video/mp4');raise exception 'Oversized accepted';exception when others then if sqlerrm<>'INVALID_UPLOAD_METADATA' then raise;end if;end;
 r:=reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');
 r:=reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','mux',4,'video/mp4');
 begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');raise exception 'Active limit exceeded';exception when others then if sqlerrm<>'UPLOAD_ACTIVE_LIMIT' then raise;end if;end;
end $$;
reset role;
update public.profiles set role='student' where id='a0000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');raise exception 'Revoked teacher prepared upload';exception when insufficient_privilege then null;end;end $$;
reset role;
delete from public.lesson_video_uploads;

insert into public.lesson_video_uploads(id,course_id,created_by,provider,expected_bytes,mime_type,state,provider_upload_id,provider_asset_id,library_id,created_at,expires_at)
values('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','bunny',4,'video/mp4','processing','video-id','video-id','library',now()-interval '2 days',now()-interval '1 hour');
do $$ begin
 begin insert into public.lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('a2000000-0000-4000-8000-000000000001','Not ready','bunny','video-id','library');raise exception 'Unprocessed attached';exception when others then if sqlerrm<>'VIDEO_NOT_READY_OR_WRONG_COURSE' then raise;end if;end;
end $$;
update public.lesson_video_uploads set state='ready';
do $$ begin
 begin insert into public.lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('a2000000-0000-4000-8000-000000000002','Wrong course','bunny','video-id','library');raise exception 'Cross-course attached';exception when others then if sqlerrm<>'VIDEO_NOT_READY_OR_WRONG_COURSE' then raise;end if;end;
end $$;
insert into public.lessons(id,section_id,title,video_provider,bunny_video_id,bunny_library_id) values('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Ready','bunny','video-id','library');
do $$ begin
 if jsonb_array_length(list_stale_video_uploads())<>0 then raise exception 'Linked upload listed for cleanup';end if;
 begin perform claim_stale_video_upload('a3000000-0000-4000-8000-000000000001');raise exception 'Linked video claimed for cleanup';exception when others then if sqlerrm<>'UPLOAD_ALREADY_LINKED' then raise;end if;end;
 begin perform cancel_lesson_video_upload('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001');raise exception 'Linked video cancelled';exception when others then if sqlerrm<>'UPLOAD_ALREADY_LINKED' then raise;end if;end;
end $$;
delete from public.lessons where id='a4000000-0000-4000-8000-000000000001';
do $$ begin
 if jsonb_array_length(list_stale_video_uploads())<>1 or list_stale_video_uploads()::text like '%upload_url%' then raise exception 'Cleanup listing wrong or secret leak';end if;
 perform claim_stale_video_upload('a3000000-0000-4000-8000-000000000001');
 begin insert into public.lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('a2000000-0000-4000-8000-000000000001','Deleting','bunny','video-id','library');raise exception 'Deleting video attached';exception when others then if sqlerrm<>'VIDEO_NOT_READY_OR_WRONG_COURSE' then raise;end if;end;
end $$;
-- Legacy lesson media has no new registry record and remains editable/playable.
insert into public.lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('a2000000-0000-4000-8000-000000000001','Legacy','bunny','legacy-video','library');
update public.lesson_video_uploads set state='reserved',provider_upload_id='video-id',expires_at=now()+interval '1 hour';
do $$ begin
 perform claim_lesson_video_upload('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001');
 begin perform claim_lesson_video_upload('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001');raise exception 'Upload reused';exception when others then if sqlerrm<>'UPLOAD_NOT_AVAILABLE' then raise;end if;end;
end $$;
-- The daily limit includes failed/cancelled attempts and cannot be reset by cancellation.
delete from public.lesson_video_uploads;
insert into public.lesson_video_uploads(course_id,created_by,provider,expected_bytes,mime_type,state)
select 'a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','bunny',1,'video/mp4','cancelled' from generate_series(1,10);
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ begin begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',4,'video/mp4');raise exception 'Daily cap bypass';exception when others then if sqlerrm<>'UPLOAD_DAILY_LIMIT' then raise;end if;end;end $$;
reset role;
delete from public.lesson_video_uploads;
insert into public.lesson_video_uploads(course_id,created_by,provider,expected_bytes,mime_type,state,created_at)
select 'a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','bunny',94371840,'video/mp4','cancelled',now()-interval '2 days' from generate_series(1,22);
set local role authenticated;
do $$ begin begin perform reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',94371840,'video/mp4');raise exception 'Course cap bypass';exception when others then if sqlerrm<>'UPLOAD_COURSE_LIMIT' then raise;end if;end;end $$;
reset role;
update public.lesson_video_uploads set state='deleted' where id=(select id from public.lesson_video_uploads limit 1);
set local role authenticated;
select reserve_lesson_video_upload('a1000000-0000-4000-8000-000000000001','bunny',94371840,'video/mp4');
reset role;
rollback;
