\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('69000000-0000-4000-8000-000000000001','support-owner@example.test','{"full_name":"Support owner"}'),
 ('69000000-0000-4000-8000-000000000002','support-other@example.test','{"full_name":"Other student"}'),
 ('69000000-0000-4000-8000-000000000003','support-teacher@example.test','{"full_name":"Course teacher"}'),
 ('69000000-0000-4000-8000-000000000004','support-staff@example.test','{"full_name":"Support staff"}'),
 ('69000000-0000-4000-8000-000000000005','support-unprivileged@example.test','{"full_name":"Other admin"}'),
 ('69000000-0000-4000-8000-000000000006','support-super@example.test','{"full_name":"Super admin"}');
update profiles set role='teacher' where id='69000000-0000-4000-8000-000000000003';
update profiles set role='admin',permissions=array['manage_support'] where id='69000000-0000-4000-8000-000000000004';
update profiles set role='admin',permissions=array['view_orders'] where id='69000000-0000-4000-8000-000000000005';
update profiles set role='admin',is_super_admin=true where id='69000000-0000-4000-8000-000000000006';
insert into courses(id,title,is_free,price,course_type,is_published) values
 ('69100000-0000-4000-8000-000000000001','Support course',true,0,'group',true),
 ('69100000-0000-4000-8000-000000000002','Other course',true,0,'group',true);
insert into enrollments(student_id,course_id) values('69000000-0000-4000-8000-000000000001','69100000-0000-4000-8000-000000000001');
insert into course_instructors(course_id,teacher_id) values('69100000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000003');
insert into orders(id,user_id,course_id,amount,currency,status,payment_method) values
 ('69200000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000001','69100000-0000-4000-8000-000000000001',20,'USD','failed','cliq'),
 ('69200000-0000-4000-8000-000000000002','69000000-0000-4000-8000-000000000002','69100000-0000-4000-8000-000000000002',20,'USD','failed','cliq');
set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.support_list_tickets(boolean,text,text,text,text,text,integer)','execute') then raise exception 'Anonymous can list support'; end if;
 if has_table_privilege(current_user,'public.support_messages','select') then raise exception 'Anonymous reads messages'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000001',true);
select set_config('test.support_ticket',support_create_ticket('69300000-0000-4000-8000-000000000001','Payment not activated','I need help with this course payment.','payment','69100000-0000-4000-8000-000000000001','69200000-0000-4000-8000-000000000001')::text,true);
do $$ declare id uuid:=current_setting('test.support_ticket')::uuid; r jsonb; a jsonb; begin
 if support_create_ticket('69300000-0000-4000-8000-000000000001','Duplicate request','Duplicate request text.','other')<>id then raise exception 'Duplicate create was not idempotent'; end if;
 if (select count(*) from support_tickets)<>1 then raise exception 'Duplicate ticket created'; end if;
 begin perform support_create_ticket(gen_random_uuid(),'Invalid reference','A description long enough.','course','69100000-0000-4000-8000-000000000002');raise exception 'Foreign course accepted';exception when others then if sqlerrm<>'SUPPORT_REFERENCE_INVALID' then raise; end if;end;
 begin perform support_create_ticket(gen_random_uuid(),'Invalid payment','A description long enough.','payment',null,'69200000-0000-4000-8000-000000000002');raise exception 'Foreign payment accepted';exception when others then if sqlerrm<>'SUPPORT_REFERENCE_INVALID' then raise; end if;end;
 begin update support_tickets set priority='urgent' where support_tickets.id=current_setting('test.support_ticket')::uuid;raise exception 'Direct ticket update allowed';exception when insufficient_privilege then null;end;
 begin perform support_reply(id,gen_random_uuid(),'Secret',true);raise exception 'Student can add internal note';exception when insufficient_privilege then null;end;
 begin perform support_update_ticket(id,1,'resolved','normal');raise exception 'Student can resolve';exception when insufficient_privilege then null;end;
 begin perform support_list_tickets(true);raise exception 'Student gets admin queue';exception when insufficient_privilege then null;end;
 a:=support_reserve_file(id,'proof.pdf','application/pdf',10);
 perform set_config('test.support_file',a->>'id',true);
 perform set_config('test.support_path',a->>'path',true);
 begin perform support_finish_file((a->>'id')::uuid);raise exception 'Absent storage file accepted';exception when others then if sqlerrm<>'SUPPORT_ATTACHMENT_INVALID' then raise;end if;end;
 insert into storage.objects(bucket_id,name) values('support-files',a->>'path');
 perform support_finish_file((a->>'id')::uuid);
 perform support_reply(id,'69300000-0000-4000-8000-000000000002','Here is the proof.',false,array[(a->>'id')::uuid]);
 perform support_reply(id,'69300000-0000-4000-8000-000000000002','Retry same submission',false,array[(a->>'id')::uuid]);
 if (select count(*) from support_messages)<>2 then raise exception 'Duplicate reply created'; end if;
 begin perform support_finish_file((a->>'id')::uuid,true);raise exception 'Linked file can be cancelled';exception when insufficient_privilege then null;end;
 begin perform support_reply(id,gen_random_uuid(),'Reuse file',false,array[(a->>'id')::uuid]);raise exception 'File reused';exception when others then if sqlerrm<>'SUPPORT_ATTACHMENT_INVALID' then raise;end if;end;
 r:=support_get_ticket(id);
 if jsonb_array_length(r->'messages')<>2 or r->'ticket'->>'order_id'<>'69200000-0000-4000-8000-000000000001' then raise exception 'Owner detail incomplete';end if;
 if r::text like '%Support staff%' or r->'staff'<>'[]'::jsonb then raise exception 'Staff directory leaked';end if;
end $$;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000002',true);
do $$ declare id uuid:=current_setting('test.support_ticket')::uuid;begin
 if exists(select 1 from support_tickets) or exists(select 1 from support_messages) or exists(select 1 from support_attachments) then raise exception 'Other student reads complaint'; end if;
 if exists(select 1 from storage.objects where bucket_id='support-files') then raise exception 'Other student reads attachment';end if;
 begin perform support_get_ticket(id);raise exception 'Other student gets detail';exception when insufficient_privilege then null;end;
 begin perform support_reply(id,gen_random_uuid(),'Access denied');raise exception 'Other student replies';exception when insufficient_privilege then null;end;
 if (support_list_tickets()->>'total')::int<>0 then raise exception 'Owner filter failed';end if;
end $$;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from support_tickets) then raise exception 'Course teacher sees student complaint'; end if;
 perform support_create_ticket(gen_random_uuid(),'Teacher complaint','Please review this teaching issue.','course','69100000-0000-4000-8000-000000000001');
end $$;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000005',true);
do $$ begin
 begin perform support_list_tickets(true);raise exception 'Unprivileged admin sees queue';exception when insufficient_privilege then null;end;
 if exists(select 1 from support_tickets) then raise exception 'Unprivileged admin reads tickets';end if;
end $$;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000004',true);
do $$ declare id uuid:=current_setting('test.support_ticket')::uuid; r jsonb; v bigint; a jsonb;begin
 r:=support_get_ticket(id,true);v:=(r->'ticket'->>'version')::bigint;
 if jsonb_array_length(r->'staff')<>2 then raise exception 'Staff options incorrect';end if;
 perform support_update_ticket(id,v,'waiting_user','high','69000000-0000-4000-8000-000000000004');
 begin perform support_update_ticket(id,v,'resolved','normal');raise exception 'Stale update accepted';exception when others then if sqlerrm<>'SUPPORT_STALE' then raise;end if;end;
 a:=support_reserve_file(id,'staff-private.png','image/png',8);
 insert into storage.objects(bucket_id,name) values('support-files',a->>'path');
 perform support_finish_file((a->>'id')::uuid);
 perform support_reply(id,gen_random_uuid(),'INTERNAL_STAFF_ONLY',true,array[(a->>'id')::uuid]);
 perform support_reply(id,gen_random_uuid(),'Please confirm your transaction reference.',false);
 r:=support_get_ticket(id,true);
 if r::text not like '%INTERNAL_STAFF_ONLY%' then raise exception 'Staff cannot see note';end if;
 if (support_list_tickets(true,p_assigned=>'me')->>'total')::int<>1 then raise exception 'Assignee filter failed';end if;
 if (support_list_tickets(true,p_query=>'Payment not activated')->>'total')::int<>1 then raise exception 'Search failed';end if;
 if (support_list_tickets(true,p_query=>'%')->>'total')::int<>0 then raise exception 'Wildcard search not literal';end if;
end $$;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000001',true);
do $$ declare id uuid:=current_setting('test.support_ticket')::uuid; r jsonb; v bigint;begin
 r:=support_get_ticket(id);
 if r::text like '%INTERNAL_STAFF_ONLY%' or r::text like '%staff-private.png%' or r::text like '%"management"%' then raise exception 'Internal content leaked';end if;
 if exists(select 1 from storage.objects where name like '%69000000-0000-4000-8000-000000000004%') then raise exception 'Internal file leaked';end if;
 if exists(select 1 from support_messages where internal) then raise exception 'Internal message leaked directly';end if;
 if (support_list_tickets()->'items'->0->>'unread')::int<>1 then raise exception 'Unread includes internal note or misses reply';end if;
 perform support_mark_read(id,(r->'messages'->-1->>'created_at')::timestamptz);
 if (support_list_tickets()->'items'->0->>'unread')::int<>0 then raise exception 'Read marker ineffective';end if;
 perform support_reply(id,gen_random_uuid(),'The reference is in the attachment.');
 r:=support_get_ticket(id); if r->'ticket'->>'status'<>'in_progress' then raise exception 'User reply did not clear waiting state';end if;
 v:=(r->'ticket'->>'version')::bigint;
 perform support_update_ticket(id,v,'closed','high','69000000-0000-4000-8000-000000000004');
 begin perform support_reply(id,gen_random_uuid(),'Closed thread reply');raise exception 'Closed reply accepted';exception when others then if sqlerrm<>'SUPPORT_REOPEN_REQUIRED' then raise;end if;end;
 perform support_update_ticket(id,v+1,'in_progress','high','69000000-0000-4000-8000-000000000004');
 r:=support_get_ticket(id); if r->'ticket'->>'status'<>'in_progress' then raise exception 'Owner reopen failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update profiles set permissions='{}' where id='69000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin perform support_get_ticket(current_setting('test.support_ticket')::uuid,true);raise exception 'Revoked staff can read';exception when insufficient_privilege then null;end;
 if exists(select 1 from support_messages) then raise exception 'Revoked staff direct access persists';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
-- Full-history pagination, quota boundaries, filename restrictions and anonymous auth.
insert into public.support_tickets(created_by,request_id,title,category)
 select '69000000-0000-4000-8000-000000000001',gen_random_uuid(),'Paging complaint '||n,'other' from generate_series(1,24)n;
insert into public.support_messages(id,ticket_id,author_id,body,internal)
 select gen_random_uuid(),current_setting('test.support_ticket')::uuid,'69000000-0000-4000-8000-000000000004',
  case when n%3=0 then 'HISTORY_INTERNAL_ONLY' else 'History reply '||n end,n%3=0 from generate_series(1,111)n;
insert into public.support_attachments(id,ticket_id,uploaded_by,name,mime,bytes,path,state,created_at)
 values('69500000-0000-4000-8000-000000000001',current_setting('test.support_ticket')::uuid,'69000000-0000-4000-8000-000000000001','expired.pdf','application/pdf',8,'expired-owner-proof','ready',now()-interval '2 hours');
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000001',true);
do $$ declare r jsonb; older jsonb; id uuid:=current_setting('test.support_ticket')::uuid; a jsonb; n integer; begin
 r:=support_list_tickets(p_page=>99999);
 if (r->>'page')::int<>2 or (r->>'total')::int<>25 or jsonb_array_length(r->'items')<>5 then raise exception 'Complaint paging failed';end if;
 r:=support_get_ticket(id);
 if jsonb_array_length(r->'messages')<>50 or not (r->>'hasMore')::boolean or r::text like '%HISTORY_INTERNAL_ONLY%' then raise exception 'History page/privacy failed';end if;
 older:=support_get_ticket(id,false,(r->'messages'->0->>'id')::uuid);
 if (older->>'hasMore')::boolean or jsonb_array_length(older->'messages')+50<>(select count(*) from support_messages where ticket_id=current_setting('test.support_ticket')::uuid) then raise exception 'Older history missing';end if;
 begin perform support_create_ticket(gen_random_uuid(),'Quota attempt','This complaint exceeds the daily limit.','other');raise exception 'Creation quota bypass';exception when others then if sqlerrm<>'SUPPORT_RATE_LIMIT' then raise;end if;end;
 begin perform support_reply(id,gen_random_uuid(),'Expired file retry',false,array['69500000-0000-4000-8000-000000000001'::uuid]);raise exception 'Expired file linked';exception when others then if sqlerrm<>'SUPPORT_ATTACHMENT_EXPIRED' then raise;end if;end;
 begin perform support_reserve_file(id,'unsafe.html','image/png',8);raise exception 'Unsafe extension accepted';exception when others then if sqlerrm<>'SUPPORT_INVALID' then raise;end if;end;
 for n in 1..3 loop perform support_reserve_file(id,'sample.pdf','application/pdf',8);end loop;
 begin perform support_reserve_file(id,'fourth.pdf','application/pdf',8);raise exception 'Active file quota bypass';exception when others then if sqlerrm<>'SUPPORT_RATE_LIMIT' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update auth.users set is_anonymous=true where id='69000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform support_create_ticket(gen_random_uuid(),'Anonymous test','An anonymous session is not an account.','other');raise exception 'Anonymous auth session opens support';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update auth.users set banned_until=now()+interval '1 day' where id='69000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000001',true);
do $$ begin
 if exists(select 1 from support_tickets) then raise exception 'Banned owner reads support';end if;
 begin perform support_list_tickets();raise exception 'Banned owner lists support';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'support_%' and c.relkind='r' and not c.relrowsecurity) then raise exception 'Support table missing RLS';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'support_%' and p.prosecdef) then raise exception 'Exposed definer function';end if;
end $$;
-- New support foreign keys must not block existing account deletion.
delete from auth.users where id='69000000-0000-4000-8000-000000000004';
do $$ begin
 if exists(select 1 from support_tickets where assigned_to='69000000-0000-4000-8000-000000000004') then raise exception 'Deleted staff remains assigned';end if;
 if not exists(select 1 from support_messages where ticket_id=current_setting('test.support_ticket')::uuid and author_id is null) then raise exception 'Deleted staff history lost';end if;
end $$;
delete from auth.users where id='69000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from support_messages where ticket_id=current_setting('test.support_ticket')::uuid)
  or exists(select 1 from support_attachments where ticket_id=current_setting('test.support_ticket')::uuid) then raise exception 'Deleted requester support rows remain';end if;
end $$;
rollback;
