\if :seed
insert into auth.users(id,email) values
 ('c0000000-0000-4000-8000-000000000001','merge-student@example.test'),
 ('c0000000-0000-4000-8000-000000000002','merge-teacher@example.test'),
 ('c0000000-0000-4000-8000-000000000003','merge-outsider@example.test');
update public.profiles set role='teacher' where id='c0000000-0000-4000-8000-000000000002';
insert into public.courses(id,title,is_published,is_free,price,course_type) values
 ('c1000000-0000-4000-8000-000000000001','First course',true,true,0,'group'),
 ('c1000000-0000-4000-8000-000000000002','Second course',true,true,0,'group');
insert into public.course_instructors(course_id,teacher_id)
 select id,'c0000000-0000-4000-8000-000000000002' from public.courses;
insert into public.enrollments(student_id,course_id)
 select 'c0000000-0000-4000-8000-000000000001',id from public.courses;
insert into public.conversations(id,student_id,teacher_id,course_id,created_at) values
 ('c2000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',now()-interval '1 day'),
 ('c2000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002',now());
insert into storage.objects(bucket_id,name,owner_id) values
 ('chat-files','c2000000-0000-4000-8000-000000000002/proof.pdf','c0000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',false);
insert into public.messages(id,conversation_id,sender_id,content) values
 ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','First message');
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000002',false);
insert into public.messages(id,conversation_id,sender_id,content,message_type,attachment_url) values
 ('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002',' ','file','c2000000-0000-4000-8000-000000000002/proof.pdf');
\else
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',true);
do $$
declare canonical uuid := 'c2000000-0000-4000-8000-000000000001';
begin
 if public.start_conversation('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002') <> canonical
 or public.start_conversation('c1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002') <> canonical
 or (select count(*) from public.conversations) <> 1 then raise exception 'Courses did not reuse the same chat'; end if;
 if (select count(*) from public.messages where conversation_id=canonical) <> 2 then raise exception 'Messages not preserved'; end if;
 if not exists(select 1 from public.messages where conversation_id=canonical and attachment_conversation_id='c2000000-0000-4000-8000-000000000002') then raise exception 'Attachment origin lost'; end if;
 if not exists(select 1 from public.chat_conversation_aliases where conversation_id=canonical) then raise exception 'Old link not resolved'; end if;
 if not exists(select 1 from storage.objects where bucket_id='chat-files') then raise exception 'Old attachment no longer readable'; end if;
 if not exists(select 1 from public.conversations where id=canonical and last_message_preview='__file__' and student_unread_count=1 and teacher_unread_count=1) then raise exception 'Merged summary incorrect'; end if;
end $$;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.chat_conversation_aliases) or exists(select 1 from storage.objects where bucket_id='chat-files') then raise exception 'Outsider sees old chat data'; end if;
end $$;
reset role;
delete from public.course_instructors;
do $$ begin
 if (select count(*) from public.messages) <> 2 then raise exception 'Unassignment deleted history'; end if;
end $$;
rollback;
\endif
