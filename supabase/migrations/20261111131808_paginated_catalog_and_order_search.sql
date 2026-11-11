-- Metadata-only course lists. Public callers can never request draft/admin data.
create function public.list_course_catalog_page(
 p_query text default '', p_category text default '', p_price text default 'all',
 p_sort text default 'latest', p_page integer default 1, p_page_size integer default 12,
 p_admin boolean default false, p_status text default 'all', p_type text default 'all'
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
 v_admin boolean := coalesce(p_admin,false);
 v_size integer := least(greatest(coalesce(p_page_size,12),1),24);
 v_page integer; v_total integer; v_rows jsonb; v_categories jsonb; v_summary jsonb;
 v_query text := lower(left(trim(coalesce(p_query,'')),120));
begin
 if v_admin and not exists(select 1 from public.profiles where id=auth.uid() and role='admin'
   and (is_super_admin or 'manage_courses'=any(permissions))) then
   raise insufficient_privilege using message='Course management permission required';
 end if;

 select coalesce(jsonb_agg(category order by category),'[]'::jsonb) into v_categories
 from (select distinct category from public.courses where (v_admin or is_published=true) and nullif(trim(category),'') is not null) c;
 if v_admin then
 select jsonb_build_object('courses',count(*),'published',count(*) filter(where is_published),
   'draft',count(*) filter(where not coalesce(is_published,false)),
   'students',(select count(*) from public.enrollments e join public.courses c on c.id=e.course_id where v_admin or c.is_published),
   'lessons',(select count(*) from public.lessons l join public.sections s on s.id=l.section_id join public.courses c on c.id=s.course_id where v_admin or c.is_published))
 into v_summary from public.courses where v_admin or is_published=true;
 else v_summary := '{}'::jsonb;
 end if;

 with candidates as (
  select c.id from public.courses c
  left join lateral (select string_agg(p.full_name,', ' order by ci.created_at,ci.id) as instructor
   from public.course_instructors ci join public.profiles p on p.id=ci.teacher_id and p.role='teacher' where ci.course_id=c.id) t on true
  where (v_admin or c.is_published=true)
   and (v_query='' or strpos(lower(concat_ws(' ',c.title,c.category,t.instructor)),v_query)>0)
   and (coalesce(p_category,'')='' or c.category=p_category)
   and (p_price not in ('free','paid') or (p_price='free' and c.is_free) or (p_price='paid' and not coalesce(c.is_free,false)))
   and (not v_admin or p_status not in ('published','draft') or (p_status='published' and c.is_published) or (p_status='draft' and not coalesce(c.is_published,false)))
   and (not v_admin or p_type not in ('group','private') or c.course_type::text=p_type)
 ) select count(*) into v_total from candidates;
 v_page := least(greatest(coalesce(p_page,1),1),greatest(1,(v_total+v_size-1)/v_size));

 with candidates as (
  select c.*,t.instructor,
   (select count(*) from public.sections s where s.course_id=c.id) as section_count,
   (select count(*) from public.lessons l join public.sections s on s.id=l.section_id where s.course_id=c.id) as lesson_count,
   case when v_admin then (select count(*) from public.enrollments e where e.course_id=c.id) else null end as enrollment_count
  from public.courses c
  left join lateral (select string_agg(p.full_name,', ' order by ci.created_at,ci.id) as instructor
   from public.course_instructors ci join public.profiles p on p.id=ci.teacher_id and p.role='teacher' where ci.course_id=c.id) t on true
  where (v_admin or c.is_published=true)
   and (v_query='' or strpos(lower(concat_ws(' ',c.title,c.category,t.instructor)),v_query)>0)
   and (coalesce(p_category,'')='' or c.category=p_category)
   and (p_price not in ('free','paid') or (p_price='free' and c.is_free) or (p_price='paid' and not coalesce(c.is_free,false)))
   and (not v_admin or p_status not in ('published','draft') or (p_status='published' and c.is_published) or (p_status='draft' and not coalesce(c.is_published,false)))
   and (not v_admin or p_type not in ('group','private') or c.course_type::text=p_type)
 ), page_rows as (
  select * from candidates order by
   case when p_sort='lessons' then lesson_count end desc nulls last,
   case when v_admin and p_sort='students' then enrollment_count end desc nulls last,
   created_at desc,id
  limit v_size offset (v_page-1)*v_size
 ) select coalesce(jsonb_agg(
  jsonb_build_object('id',id,'title',title,'category',category,'image_url',image_url,'price',price,'currency',currency,
   'is_free',is_free,'course_type',course_type,'is_published',is_published,'created_at',created_at,
   'discount_type',discount_type,'discount_value',discount_value,'delivery_type',delivery_type,
   'instructor',instructor,'lesson_count',lesson_count)
  || case when v_admin then jsonb_build_object('section_count',section_count,'enrollment_count',enrollment_count) else '{}'::jsonb end
 ),'[]'::jsonb) into v_rows from page_rows;
 return jsonb_build_object('items',v_rows,'total',v_total,'page',v_page,'pageSize',v_size,
   'totalPages',greatest(1,(v_total+v_size-1)/v_size),'categories',v_categories,
   'summary',case when v_admin then v_summary else '{}'::jsonb end);
end $$;
revoke all on function public.list_course_catalog_page(text,text,text,text,integer,integer,boolean,text,text) from public;
grant execute on function public.list_course_catalog_page(text,text,text,text,integer,integer,boolean,text,text) to anon,authenticated,service_role;

create function public.admin_list_orders_page(
 p_query text default '', p_status text default 'all', p_page integer default 1, p_page_size integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
 v_size integer := least(greatest(coalesce(p_page_size,20),1),50);
 v_page integer; v_total integer; v_rows jsonb;
 v_query text := lower(left(trim(coalesce(p_query,'')),120));
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin'
   and (is_super_admin or 'view_orders'=any(permissions))) then
   raise insufficient_privilege using message='Order viewing permission required';
 end if;
 select count(*) into v_total from public.orders o
 left join public.profiles p on p.id=o.user_id left join public.courses c on c.id=o.course_id
 where o.status in ('paid','failed','pending') and (p_status not in ('paid','failed','pending') or o.status=p_status)
  and (v_query='' or strpos(lower(concat_ws(' ',p.full_name,c.title,o.id::text)),v_query)>0);
 v_page := least(greatest(coalesce(p_page,1),1),greatest(1,(v_total+v_size-1)/v_size));
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
  select o.id,o.amount,o.currency,o.status,o.created_at,o.user_id,o.course_id,o.payment_method,o.payment_proof,
   coalesce(p.full_name,'') as "studentName",jsonb_build_array(jsonb_build_object('title',coalesce(c.title,''))) as courses
  from public.orders o left join public.profiles p on p.id=o.user_id left join public.courses c on c.id=o.course_id
  where o.status in ('paid','failed','pending') and (p_status not in ('paid','failed','pending') or o.status=p_status)
   and (v_query='' or strpos(lower(concat_ws(' ',p.full_name,c.title,o.id::text)),v_query)>0)
  order by o.created_at desc,o.id limit v_size offset (v_page-1)*v_size
 ) r;
 return jsonb_build_object('items',v_rows,'total',v_total,'page',v_page,'pageSize',v_size,'totalPages',greatest(1,(v_total+v_size-1)/v_size));
end $$;
revoke all on function public.admin_list_orders_page(text,text,integer,integer) from public,anon;
grant execute on function public.admin_list_orders_page(text,text,integer,integer) to authenticated,service_role;
