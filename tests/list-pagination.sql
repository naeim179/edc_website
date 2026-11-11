\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000101','paging-student@example.test','{"full_name":"QA paging student"}'),
 ('00000000-0000-4000-8000-000000000102','paging-teacher@example.test','{"full_name":"QA catalog teacher"}'),
 ('00000000-0000-4000-8000-000000000103','paging-orders@example.test','{}'),
 ('00000000-0000-4000-8000-000000000104','paging-super@example.test','{}'),
 ('00000000-0000-4000-8000-000000000105','paging-courses@example.test','{}');
update profiles set role='teacher' where id='00000000-0000-4000-8000-000000000102';
update profiles set role='admin',permissions=array['view_orders'] where id='00000000-0000-4000-8000-000000000103';
update profiles set role='admin',is_super_admin=true where id='00000000-0000-4000-8000-000000000104';
update profiles set role='admin',permissions=array['manage_courses'] where id='00000000-0000-4000-8000-000000000105';
insert into courses(id,title,category,is_free,price,course_type,is_published,created_at)
 select ('41000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Catalog QA '||lpad(n::text,3,'0'),
  case when n%2=0 then 'Beta' else 'Alpha' end,n%3=0,20,'group',true,'2026-01-01'::timestamptz+n*interval '1 second'
 from generate_series(1,106) n;
insert into courses(id,title,category,is_free,price,course_type,is_published) values
 ('41000000-0000-4000-8000-000000000999','Hidden QA Draft','Draft only',true,0,'group',false);
insert into course_instructors(course_id,teacher_id) values('41000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102');
insert into sections(id,course_id,title,order_index) values('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','Section',1);
insert into lessons(section_id,title,content_url,video_provider,bunny_video_id,order_index) values
 ('42000000-0000-4000-8000-000000000001','Lesson','secret-media-url','bunny','secret-video-id',1);
insert into orders(id,user_id,course_id,amount,currency,status,payment_method,created_at)
 select ('43000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-4000-8000-000000000101',
 ('41000000-0000-4000-8000-'||lpad((case when n<=5 then n else 1 end)::text,12,'0'))::uuid,20,'USD',case when n<=5 then 'pending' else 'failed' end,'cliq',
 '2026-01-01'::timestamptz+n*interval '1 second' from generate_series(1,45)n;

set local role anon;
do $$ declare r jsonb; begin
 r:=list_course_catalog_page(p_page=>9);
 if (r->>'total')::int<>106 or jsonb_array_length(r->'items')<>10 then raise exception 'Courses beyond 100 are missing'; end if;
 if r::text like '%secret-media%' or r::text like '%secret-video%' or r::text like '%bunny_video_id%' or r::text like '%enrollment_count%' then raise exception 'Public page leaks private data'; end if;
 if r::text like '%Hidden QA Draft%' or (r->'categories')?'Draft only' then raise exception 'Draft leaked'; end if;
 r:=list_course_catalog_page(p_query=>'Catalog QA 001');
 if (r->>'total')::int<>1 then raise exception 'Search only checks the current page'; end if;
 r:=list_course_catalog_page(p_query=>'QA catalog teacher');
 if (r->>'total')::int<>1 then raise exception 'Instructor search missing'; end if;
 r:=list_course_catalog_page(p_category=>'Beta',p_price=>'free');
 if (r->>'total')::int<>17 then raise exception 'Combined filters incorrect'; end if;
 r:=list_course_catalog_page(p_query=>'%');
 if (r->>'total')::int<>0 or (r->>'page')::int<>1 or (r->>'totalPages')::int<>1 then raise exception 'Empty or literal wildcard search incorrect'; end if;
 r:=list_course_catalog_page(p_page=>1000000,p_page_size=>1000000);
 if (r->>'pageSize')::int<>24 or (r->>'page')::int<>5 then raise exception 'Unbounded pagination'; end if;
 if exists(select 1 from jsonb_array_elements(list_course_catalog_page(p_page=>1)->'items') a,
   jsonb_array_elements(list_course_catalog_page(p_page=>2)->'items') b where a->>'id'=b->>'id') then raise exception 'Duplicate page rows'; end if;
 begin perform list_course_catalog_page(p_admin=>true);raise exception 'Anonymous requested admin metadata';exception when insufficient_privilege then null;end;
 if has_function_privilege(current_user,'public.admin_list_orders_page(text,text,integer,integer)','execute') then raise exception 'Anonymous can call order page'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
do $$ begin
 begin perform admin_list_orders_page();raise exception 'Student reads orders';exception when insufficient_privilege then null;end;
 begin perform list_course_catalog_page(p_admin=>true);raise exception 'Student reads course admin metadata';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
do $$ declare r jsonb;begin
 r:=admin_list_orders_page();if (r->>'total')::int<>45 or jsonb_array_length(r->'items')<>20 then raise exception 'Orders not paged';end if;
 r:=admin_list_orders_page(p_page=>3);if jsonb_array_length(r->'items')<>5 then raise exception 'Last order page wrong';end if;
 r:=admin_list_orders_page(p_status=>'pending');if (r->>'total')::int<>5 then raise exception 'Order status filter wrong';end if;
 r:=admin_list_orders_page(p_query=>'43000000-0000-4000-8000-000000000001');if (r->>'total')::int<>1 then raise exception 'Order search missing off-page result';end if;
 begin perform list_course_catalog_page(p_admin=>true);raise exception 'Order-only staff reads course management';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000105',true);
do $$ declare r jsonb;begin
 r:=list_course_catalog_page(p_admin=>true,p_status=>'draft');
 if (r->>'total')::int<>1 or r->'items'->0->>'title'<>'Hidden QA Draft' then raise exception 'Course admin cannot filter drafts';end if;
 begin perform admin_list_orders_page();raise exception 'Course-only staff reads orders';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000104',true);
do $$ declare r jsonb;begin
 r:=list_course_catalog_page(p_admin=>true);if (r->>'total')::int<>107 then raise exception 'Super admin course list wrong';end if;
 r:=admin_list_orders_page(p_page_size=>1000000);if (r->>'pageSize')::int<>50 then raise exception 'Unbounded order page';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update profiles set role='student' where id='00000000-0000-4000-8000-000000000103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
do $$ begin
 begin perform admin_list_orders_page();raise exception 'Revoked role retains order access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
