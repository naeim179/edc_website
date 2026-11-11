-- Synthetic benchmark only; called on a disposable PostgreSQL container.
begin;
insert into auth.users(id,email) values('b0000000-0000-4000-8000-000000000001','bench-owner@test.invalid'),('b0000000-0000-4000-8000-000000000002','bench-other@test.invalid');
insert into public.courses(id,title,is_published,is_free,price,course_type)
 select ('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Performance QA '||n,true,true,0,'group' from generate_series(1,100)n;
insert into public.sections(id,course_id,title,order_index)
 select ('b2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Section',1 from generate_series(1,100)n;
insert into public.lessons(section_id,title,order_index)
 select ('b2000000-0000-4000-8000-'||lpad(((n%100)+1)::text,12,'0'))::uuid,'Bench lesson '||n,n from generate_series(1,20000)n;
insert into public.orders(user_id,course_id,amount,currency,status,payment_method,created_at)
 select case when n%1000=0 then 'b0000000-0000-4000-8000-000000000001'::uuid else 'b0000000-0000-4000-8000-000000000002'::uuid end,
 ('b1000000-0000-4000-8000-'||lpad(((n%100)+1)::text,12,'0'))::uuid,0,'USD','failed','cliq',now()-n*interval '1 second' from generate_series(1,20000)n;
analyze public.orders;analyze public.lessons;analyze public.sections;analyze public.courses;
create function pg_temp.benchmark_plan(q text) returns jsonb language plpgsql as $$ declare r jsonb;begin execute 'explain(analyze,buffers,format json) '||q into r;return r;end $$;
set local role authenticated;
set local request.jwt.claim.sub='b0000000-0000-4000-8000-000000000001';
select jsonb_build_object(
 'orders',pg_temp.benchmark_plan('select id from public.orders where user_id=''b0000000-0000-4000-8000-000000000001'' order by created_at desc limit 20'),
 'catalog',pg_temp.benchmark_plan('select public.list_course_catalog_page(p_query=>''Performance QA'')')
);
reset role;
rollback;
