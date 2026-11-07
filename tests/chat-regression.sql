\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('c0000000-0000-4000-8000-000000000001','chat-student@example.test'),
 ('c0000000-0000-4000-8000-000000000002','chat-teacher@example.test'),
 ('c0000000-0000-4000-8000-000000000003','chat-outsider@example.test'),
 ('c0000000-0000-4000-8000-000000000004','chat-admin@example.test');
update public.profiles set role='teacher' where id='c0000000-0000-4000-8000-000000000002';
update public.profiles set role='admin' where id='c0000000-0000-4000-8000-000000000004';
insert into public.courses(id,title,is_published,is_free,price,course_type)
 values('c1000000-0000-4000-8000-000000000001','Chat regression',true,true,0,'group');
insert into public.course_instructors(course_id,teacher_id) values('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002');
insert into public.enrollments(student_id,course_id) values('c0000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',true);
select public.start_conversation('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002') as chat_id \gset
select public.start_conversation('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name,owner_id) values('chat-files',:'chat_id'||'/proof.pdf',auth.uid()::text);
insert into public.messages(id,conversation_id,sender_id,content) values
 ('c2000000-0000-4000-8000-000000000001',:'chat_id',auth.uid(),'Older message'),
 ('c2000000-0000-4000-8000-000000000002',:'chat_id',auth.uid(),'Latest original');
do $$ begin
 if (select count(*) from public.conversations)<>1 then raise exception 'Duplicate conversation'; end if;
 if (select last_message_preview from public.conversations)<>'Latest original' then raise exception 'Insert preview'; end if;
 if (select teacher_unread_count from public.conversations)<>2 then raise exception 'Unread insert'; end if;
end $$;
update public.messages set content='Latest edited' where id='c2000000-0000-4000-8000-000000000002';
do $$ begin
 if (select last_message_preview from public.conversations)<>'Latest edited' then raise exception 'Edit preview stale'; end if;
 if (select teacher_unread_count from public.conversations)<>2 then raise exception 'Edit must not increment unread'; end if;
 begin update public.messages set conversation_id=gen_random_uuid() where id='c2000000-0000-4000-8000-000000000002'; raise exception 'Message moved'; exception when insufficient_privilege then null; end;
 begin update public.messages set read_at=now() where id='c2000000-0000-4000-8000-000000000002'; raise exception 'Forged read receipt'; exception when insufficient_privilege then null; end;
 begin insert into public.messages(conversation_id,sender_id,content) select id,auth.uid(),'  ' from public.conversations; raise exception 'Whitespace accepted'; exception when check_violation then null; end;
 begin insert into public.messages(conversation_id,sender_id,content) select id,auth.uid(),repeat('x',4001) from public.conversations; raise exception 'Oversized accepted'; exception when check_violation then null; end;
end $$;
update public.messages set deleted_at=now(),content='' where id='c2000000-0000-4000-8000-000000000002';
do $$ begin
 if (select last_message_preview from public.conversations)<>'__deleted__' then raise exception 'Deleted preview leaked'; end if;
 if (select teacher_unread_count from public.conversations)<>1 then raise exception 'Deleted unread counted'; end if;
 begin update public.messages set deleted_at=null,content='Resurrected' where id='c2000000-0000-4000-8000-000000000002'; raise exception 'Resurrection accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('realtime.topic','messages-'||:'chat_id',true);
insert into realtime.messages(topic,extension) values('messages-'||:'chat_id','broadcast');
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.messages) or exists(select 1 from public.conversations) then raise exception 'Outsider sees chat'; end if;
 if exists(select 1 from realtime.messages) then raise exception 'Outsider sees typing'; end if;
 begin insert into realtime.messages(topic,extension) values(current_setting('realtime.topic'),'broadcast'); raise exception 'Outsider broadcasts'; exception when insufficient_privilege then null; end;
 begin perform public.mark_conversation_read((select id from public.conversations limit 1)); raise exception 'Outsider read RPC'; exception when insufficient_privilege then null; end;
 begin perform public.start_conversation('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002'); raise exception 'Unenrolled student starts'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 if exists(select 1 from realtime.messages) then raise exception 'Anonymous typing read'; end if;
 begin insert into realtime.messages(topic,extension) values(current_setting('realtime.topic'),'broadcast'); raise exception 'Anonymous typing write'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000002',true);
select public.mark_conversation_read(:'chat_id');
do $$ begin
 if (select teacher_unread_count from public.conversations)<>0 then raise exception 'Read count not cleared'; end if;
 if not exists(select 1 from realtime.messages) then raise exception 'Teacher cannot read typing'; end if;
 insert into realtime.messages(topic,extension) values(current_setting('realtime.topic'),'broadcast');
 if exists(select 1 from public.messages where sender_id<>auth.uid() and read_at is null) then raise exception 'Receipt missing'; end if;
 update public.messages set content='Hacked' where id='c2000000-0000-4000-8000-000000000001';
 if exists(select 1 from public.messages where content='Hacked') then raise exception 'Recipient edited sender'; end if;
end $$;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000004',true);
do $$ begin
 if (select count(*) from public.messages)<>2 then raise exception 'Admin cannot read'; end if;
 if not exists(select 1 from realtime.messages) then raise exception 'Admin cannot observe channel'; end if;
 begin insert into realtime.messages(topic,extension) values(current_setting('realtime.topic'),'broadcast'); raise exception 'Admin broadcasts'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from storage.objects where bucket_id='chat-files') then raise exception 'Admin cannot read attachment'; end if;
 update public.messages set content='Admin edit';
 if exists(select 1 from public.messages where content='Admin edit') then raise exception 'Admin can edit'; end if;
 begin insert into public.messages(conversation_id,sender_id,content) select id,auth.uid(),'Admin send' from public.conversations; raise exception 'Admin writes'; exception when insufficient_privilege then null; end;
 begin perform public.mark_conversation_read((select id from public.conversations)); raise exception 'Admin read mutation'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',true);
-- Old edits do not overwrite the newest preview; attachments and boundary lengths work.
update public.messages set content='Older edited' where id='c2000000-0000-4000-8000-000000000001';
do $$ begin if (select last_message_preview from public.conversations)<>'__deleted__' then raise exception 'Older edit overwrote newest'; end if; end $$;
update public.messages set content='Older message' where id='c2000000-0000-4000-8000-000000000001';
insert into public.messages(id,conversation_id,sender_id,content,message_type,attachment_url,attachment_name,attachment_size) values
 ('c2000000-0000-4000-8000-000000000003',:'chat_id',auth.uid(),' ','file',:'chat_id'||'/proof.pdf','proof.pdf',12);
do $$ begin if (select last_message_preview from public.conversations)<>'__file__' then raise exception 'File preview'; end if; end $$;
insert into public.messages(id,conversation_id,sender_id,content,message_type,attachment_url,attachment_name,attachment_size) values
 ('c2000000-0000-4000-8000-000000000004',:'chat_id',auth.uid(),' ','image',:'chat_id'||'/image.png','image.png',12);
do $$ begin if (select last_message_preview from public.conversations)<>'__image__' then raise exception 'Image preview'; end if; end $$;
update public.messages set deleted_at=now() where id='c2000000-0000-4000-8000-000000000004';
do $$ begin if exists(select 1 from public.messages where deleted_at is not null and attachment_url is not null) then raise exception 'Deleted attachment retained'; end if; end $$;
delete from public.messages where id in ('c2000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000004');
insert into public.messages(id,conversation_id,sender_id,content) values('c2000000-0000-4000-8000-000000000005',:'chat_id',auth.uid(),repeat('x',4000));
delete from public.messages where id='c2000000-0000-4000-8000-000000000005';
delete from public.messages where id='c2000000-0000-4000-8000-000000000002';
do $$ begin if (select last_message_preview from public.conversations)<>'Older message' then raise exception 'Hard delete preview stale'; end if; end $$;
delete from public.messages where id='c2000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.conversations where last_message_preview is not null or last_message_at is not null or teacher_unread_count<>0 or student_unread_count<>0) then raise exception 'Empty chat summary not reset'; end if;
end $$;
reset role;
rollback;
\echo 'Chat regression checks passed.'
