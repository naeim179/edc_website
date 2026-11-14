-- Support is separate from course chat. Clients cannot mutate audit/ownership columns.
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 created_by uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 title text not null check(char_length(title) between 3 and 160),
 category text not null check(category in ('course','payment','technical','account','other')),
 status text not null default 'new' check(status in ('new','in_progress','waiting_user','resolved','closed')),
 priority text not null default 'normal' check(priority in ('normal','high','urgent')),
 course_id uuid references public.courses(id) on delete set null,
 order_id uuid references public.orders(id) on delete set null,
 assigned_to uuid references public.profiles(id) on delete set null,
 version bigint not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(created_by,request_id)
);
create table public.support_messages (
 id uuid primary key,
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid references public.profiles(id) on delete set null,
 body text not null check(char_length(body)<=5000),
 internal boolean not null default false,
 created_at timestamptz not null default clock_timestamp()
);
create table public.support_events (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 kind text not null check(kind in ('created','status','management')),
 before_value jsonb, after_value jsonb,
 created_at timestamptz not null default clock_timestamp()
);
create table public.support_attachments (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 message_id uuid references public.support_messages(id) on delete cascade,
 uploaded_by uuid references public.profiles(id) on delete set null,
 name text not null check(char_length(name) between 1 and 160),
 mime text not null check(mime in ('image/png','image/jpeg','application/pdf')),
 bytes integer not null check(bytes between 1 and 5242880),
 path text not null unique,
 state text not null default 'reserved' check(state in ('reserved','ready','linked','cancelled')),
 created_at timestamptz not null default clock_timestamp()
);
create index support_tickets_owner_idx on public.support_tickets(created_by,updated_at desc,id);
create index support_tickets_queue_idx on public.support_tickets(status,updated_at desc,id);
create index support_tickets_assignee_idx on public.support_tickets(assigned_to,status);
create index support_tickets_course_idx on public.support_tickets(course_id);
create index support_tickets_order_idx on public.support_tickets(order_id);
create index support_messages_thread_idx on public.support_messages(ticket_id,created_at desc,id desc);
create index support_messages_author_idx on public.support_messages(author_id,created_at desc);
create index support_events_thread_idx on public.support_events(ticket_id,created_at desc);
create index support_events_actor_idx on public.support_events(actor_id);
create index support_attachments_ticket_idx on public.support_attachments(ticket_id);
create index support_attachments_message_idx on public.support_attachments(message_id);
create index support_attachments_user_idx on public.support_attachments(uploaded_by,created_at desc);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.support_active_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid()
   and p.role in ('student','teacher','admin') and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<now()));
$$;
create function private.support_staff(p_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_id and p.role='admin'
   and (p.is_super_admin or 'manage_support'=any(p.permissions)) and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<now()));
$$;
create function private.support_can_read(p_ticket uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.support_active_user() and exists(select 1 from public.support_tickets t where t.id=p_ticket
   and (t.created_by=auth.uid() or private.support_staff()));
$$;
revoke all on function private.support_active_user(),private.support_staff(uuid),private.support_can_read(uuid) from public,anon;
grant execute on function private.support_active_user(),private.support_staff(uuid),private.support_can_read(uuid) to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_events enable row level security;
alter table public.support_attachments enable row level security;
revoke all on public.support_tickets,public.support_messages,public.support_events,public.support_attachments from public,anon,authenticated;
grant select on public.support_tickets,public.support_messages,public.support_events,public.support_attachments to authenticated;
grant all on public.support_tickets,public.support_messages,public.support_events,public.support_attachments to service_role;
create policy support_tickets_read on public.support_tickets for select to authenticated
 using ((select private.support_active_user()) and (created_by=(select auth.uid()) or (select private.support_staff())));
create policy support_messages_read on public.support_messages for select to authenticated
 using (private.support_can_read(ticket_id) and (not internal or (select private.support_staff())));
create policy support_events_read on public.support_events for select to authenticated
 using (private.support_can_read(ticket_id) and (kind in ('created','status') or (select private.support_staff())));
create policy support_attachments_read on public.support_attachments for select to authenticated using (
 private.support_can_read(ticket_id) and (
  (message_id is null and uploaded_by=(select auth.uid())) or
  exists(select 1 from public.support_messages m where m.id=message_id and (not m.internal or (select private.support_staff())))
 ));

-- Privileged transaction implementations live outside the Data API schema. Public
-- wrappers are SECURITY INVOKER; each private mutation checks the current actor.
create function private.support_create(p_request uuid,p_title text,p_body text,p_category text,p_course uuid,p_order uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if not private.support_active_user() then raise insufficient_privilege; end if;
 if p_request is null or p_title is null or length(btrim(p_title)) not between 3 and 160
  or p_body is null or length(btrim(p_body)) not between 10 and 5000 or p_category is null
  or p_category not in ('course','payment','technical','account','other') then raise exception 'SUPPORT_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended('support-user:'||v_user::text,0));
 select id into v_id from public.support_tickets where created_by=v_user and request_id=p_request;
 if found then return v_id; end if;
 if (select count(*) from public.support_tickets where created_by=v_user and created_at>now()-interval '24 hours')>=10 then raise exception 'SUPPORT_RATE_LIMIT'; end if;
 if p_course is not null and not exists(select 1 from public.courses c where c.id=p_course and (
  exists(select 1 from public.enrollments e where e.course_id=c.id and e.student_id=v_user) or
  exists(select 1 from public.course_instructors ci where ci.course_id=c.id and ci.teacher_id=v_user) or
  exists(select 1 from public.orders o where o.course_id=c.id and o.user_id=v_user))) then raise exception 'SUPPORT_REFERENCE_INVALID'; end if;
 if p_order is not null and not exists(select 1 from public.orders where id=p_order and user_id=v_user
   and (p_course is null or course_id=p_course)) then raise exception 'SUPPORT_REFERENCE_INVALID'; end if;
 insert into public.support_tickets(created_by,request_id,title,category,course_id,order_id)
 values(v_user,p_request,btrim(p_title),p_category,p_course,p_order) returning id into v_id;
 insert into public.support_messages(id,ticket_id,author_id,body) values(p_request,v_id,v_user,btrim(p_body));
 insert into public.support_events(ticket_id,actor_id,kind,after_value) values(v_id,v_user,'created','{"status":"new"}');
 return v_id;
end $$;

create function private.support_reply(p_ticket uuid,p_request uuid,p_body text,p_internal boolean,p_files uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.support_tickets; m public.support_messages; v_user uuid:=auth.uid(); v_new text;
begin
 if not private.support_active_user() then raise insufficient_privilege; end if;
 perform pg_advisory_xact_lock(hashtextextended('support-user:'||v_user::text,0));
 select * into t from public.support_tickets where id=p_ticket for update;
 if not found or (t.created_by<>v_user and not private.support_staff()) or (coalesce(p_internal,false) and not private.support_staff()) then raise insufficient_privilege; end if;
 select * into m from public.support_messages where id=p_request;
 if found then
  if m.ticket_id=p_ticket and m.author_id=v_user then return m.id; end if;
  raise insufficient_privilege;
 end if;
 if p_request is null or p_body is null or length(btrim(p_body))>5000 or p_files is null or cardinality(p_files)>3
   or (btrim(p_body)='' and cardinality(p_files)=0) then raise exception 'SUPPORT_INVALID'; end if;
 if not coalesce(p_internal,false) and t.status in ('resolved','closed') then raise exception 'SUPPORT_REOPEN_REQUIRED'; end if;
 if (select count(*) from public.support_messages where author_id=v_user and created_at>now()-interval '24 hours')>=100 then raise exception 'SUPPORT_RATE_LIMIT'; end if;
 if (select count(distinct x) from unnest(p_files) x)<>cardinality(p_files) then raise exception 'SUPPORT_INVALID'; end if;
 -- Locks serialize linking against cancellations and prevent reuse in another message.
 perform 1 from public.support_attachments where id=any(p_files) order by id for update;
 if exists(select 1 from public.support_attachments where id=any(p_files) and ticket_id=t.id
   and uploaded_by=v_user and state='ready' and created_at<=now()-interval '1 hour') then raise exception 'SUPPORT_ATTACHMENT_EXPIRED'; end if;
 if (select count(*) from public.support_attachments where id=any(p_files) and ticket_id=t.id
   and uploaded_by=v_user and state='ready' and message_id is null and created_at>now()-interval '1 hour')<>cardinality(p_files) then raise exception 'SUPPORT_ATTACHMENT_INVALID'; end if;
 insert into public.support_messages(id,ticket_id,author_id,body,internal) values(p_request,p_ticket,v_user,btrim(p_body),coalesce(p_internal,false));
 update public.support_attachments set message_id=p_request,state='linked' where id=any(p_files);
 v_new:=case when not coalesce(p_internal,false) and t.status='new' and private.support_staff() then 'in_progress'
  when not coalesce(p_internal,false) and t.status='waiting_user' and t.created_by=v_user then 'in_progress' else t.status end;
 update public.support_tickets set status=v_new,version=version+1,
   updated_at=case when coalesce(p_internal,false) then updated_at else clock_timestamp() end where id=p_ticket;
 if v_new<>t.status then insert into public.support_events(ticket_id,actor_id,kind,before_value,after_value)
   values(t.id,v_user,'status',jsonb_build_object('status',t.status),jsonb_build_object('status',v_new)); end if;
 return p_request;
end $$;

create function private.support_update(p_ticket uuid,p_version bigint,p_status text,p_priority text,p_assignee uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare t public.support_tickets; v_staff boolean:=private.support_staff();
begin
 if not private.support_active_user() then raise insufficient_privilege; end if;
 select * into t from public.support_tickets where id=p_ticket for update;
 if not found or (t.created_by<>auth.uid() and not v_staff) then raise insufficient_privilege; end if;
 if p_version is null or p_version<>t.version then raise exception 'SUPPORT_STALE'; end if;
 if p_status is null or p_status not in ('new','in_progress','waiting_user','resolved','closed') then raise exception 'SUPPORT_INVALID'; end if;
 if not v_staff then
  if not ((p_status='closed' and t.status<>'closed') or (p_status='in_progress' and t.status in ('resolved','closed')))
    or p_priority is distinct from t.priority or p_assignee is distinct from t.assigned_to then raise insufficient_privilege; end if;
 else
  if p_priority is null or p_priority not in ('normal','high','urgent') then raise exception 'SUPPORT_INVALID'; end if;
  if p_assignee is not null and not private.support_staff(p_assignee) then raise exception 'SUPPORT_ASSIGNEE_INVALID'; end if;
 end if;
 if p_status=t.status and p_priority=t.priority and p_assignee is not distinct from t.assigned_to then return true; end if;
 if p_status<>t.status then insert into public.support_events(ticket_id,actor_id,kind,before_value,after_value)
  values(t.id,auth.uid(),'status',jsonb_build_object('status',t.status),jsonb_build_object('status',p_status)); end if;
 if (p_priority,p_assignee) is distinct from (t.priority,t.assigned_to) then
  insert into public.support_events(ticket_id,actor_id,kind,before_value,after_value) values(t.id,auth.uid(),'management',
    jsonb_build_object('priority',t.priority,'assigned_to',t.assigned_to),jsonb_build_object('priority',p_priority,'assigned_to',p_assignee)); end if;
 update public.support_tickets set status=p_status,priority=p_priority,assigned_to=p_assignee,version=version+1,updated_at=clock_timestamp() where id=t.id;
 return true;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('support-files','support-files',false,5242880,array['image/png','image/jpeg','application/pdf']);
create function private.support_reserve_file(p_ticket uuid,p_name text,p_mime text,p_bytes integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_path text;
begin
 if not private.support_can_read(p_ticket) then raise insufficient_privilege; end if;
 if p_name is null or length(p_name) not between 1 and 160 or p_name ~ '[\x00-\x1F/\\]' or p_mime is null
  or p_mime not in ('image/png','image/jpeg','application/pdf')
  or not ((p_mime='image/png' and p_name ~* '\.png$') or (p_mime='image/jpeg' and p_name ~* '\.(jpg|jpeg)$') or (p_mime='application/pdf' and p_name ~* '\.pdf$')) or p_bytes is null or p_bytes not between 1 and 5242880 then raise exception 'SUPPORT_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended('support-user:'||auth.uid()::text,0));
 if (select count(*) from public.support_attachments where uploaded_by=auth.uid() and created_at>now()-interval '24 hours')>=15
  or (select count(*) from public.support_attachments where uploaded_by=auth.uid() and state in ('reserved','ready') and created_at>now()-interval '15 minutes')>=3 then raise exception 'SUPPORT_RATE_LIMIT'; end if;
 v_path:=p_ticket::text||'/'||auth.uid()::text||'/'||v_id::text;
 insert into public.support_attachments(id,ticket_id,uploaded_by,name,mime,bytes,path) values(v_id,p_ticket,auth.uid(),p_name,p_mime,p_bytes,v_path);
 return jsonb_build_object('id',v_id,'path',v_path);
end $$;
create function private.support_finish_file(p_id uuid,p_cancel boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare a public.support_attachments;
begin
 select * into a from public.support_attachments where id=p_id for update;
 if not found or a.uploaded_by<>auth.uid() or not private.support_can_read(a.ticket_id) or a.state='linked' then raise insufficient_privilege; end if;
 if coalesce(p_cancel,false) then update public.support_attachments set state='cancelled' where id=a.id; return true; end if;
 if a.state<>'reserved' or a.created_at<now()-interval '15 minutes' or not exists(
  select 1 from storage.objects where bucket_id='support-files' and name=a.path) then raise exception 'SUPPORT_ATTACHMENT_INVALID'; end if;
 update public.support_attachments set state='ready' where id=a.id;
 return true;
end $$;
create policy support_files_upload on storage.objects for insert to authenticated with check (
 bucket_id='support-files' and exists(select 1 from public.support_attachments a where a.path=storage.objects.name
  and a.uploaded_by=(select auth.uid()) and a.state='reserved' and a.created_at>now()-interval '15 minutes')
);
create policy support_files_read on storage.objects for select to authenticated using (
 bucket_id='support-files' and exists(select 1 from public.support_attachments a where a.path=storage.objects.name
  and (a.state='linked' or a.uploaded_by=(select auth.uid())))
);
create policy support_files_remove on storage.objects for delete to authenticated using (
 bucket_id='support-files' and exists(select 1 from public.support_attachments a where a.path=storage.objects.name
  and a.uploaded_by=(select auth.uid()) and a.message_id is null)
);

create table public.support_reads (
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 last_read_at timestamptz not null,
 primary key(ticket_id,user_id)
);
create index support_reads_user_idx on public.support_reads(user_id);
alter table public.support_reads enable row level security;
revoke all on public.support_reads from public,anon,authenticated;
grant select on public.support_reads to authenticated;
grant all on public.support_reads to service_role;
create policy support_reads_own on public.support_reads for select to authenticated
 using(user_id=(select auth.uid()) and private.support_can_read(ticket_id));
create function private.support_mark_read(p_ticket uuid,p_through timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not private.support_can_read(p_ticket) then raise insufficient_privilege; end if;
 if p_through is null or p_through>clock_timestamp() then raise exception 'SUPPORT_INVALID'; end if;
 insert into public.support_reads(ticket_id,user_id,last_read_at) values(p_ticket,auth.uid(),p_through)
 on conflict(ticket_id,user_id) do update set last_read_at=greatest(support_reads.last_read_at,excluded.last_read_at);
 return true;
end $$;
create function public.support_mark_read(p_ticket uuid,p_through timestamptz) returns boolean
language sql security invoker set search_path='' as $$select private.support_mark_read(p_ticket,p_through)$$;

create function private.support_list(p_staff boolean,p_query text,p_status text,p_category text,p_priority text,p_assigned text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total integer; v_page integer; v_items jsonb; v_stats jsonb;
begin
 if not private.support_active_user() or (coalesce(p_staff,false) and not private.support_staff()) then raise insufficient_privilege; end if;
 select jsonb_build_object('total',count(*),'active',count(*) filter(where status not in ('resolved','closed')),
   'waiting',count(*) filter(where status='waiting_user'),'resolved',count(*) filter(where status in ('resolved','closed')))
 into v_stats from public.support_tickets where coalesce(p_staff,false) or created_by=auth.uid();
 with filtered as (select t.* from public.support_tickets t where (coalesce(p_staff,false) or t.created_by=auth.uid())
  and (coalesce(p_query,'')='' or strpos(lower(t.title),lower(left(p_query,160)))>0 or strpos(t.number::text,left(p_query,160))>0)
  and (coalesce(p_status,'')='' or t.status=p_status) and (coalesce(p_category,'')='' or t.category=p_category)
  and (coalesce(p_priority,'')='' or t.priority=p_priority)
  and (coalesce(p_assigned,'')='' or (p_assigned='me' and t.assigned_to=auth.uid()) or (p_assigned='none' and t.assigned_to is null)))
 select count(*) into v_total from filtered;
 v_page:=greatest(1,least(coalesce(p_page,1),greatest(1,ceil(v_total/20.0)::integer)));
 with filtered as (select t.* from public.support_tickets t where (coalesce(p_staff,false) or t.created_by=auth.uid())
  and (coalesce(p_query,'')='' or strpos(lower(t.title),lower(left(p_query,160)))>0 or strpos(t.number::text,left(p_query,160))>0)
  and (coalesce(p_status,'')='' or t.status=p_status) and (coalesce(p_category,'')='' or t.category=p_category)
  and (coalesce(p_priority,'')='' or t.priority=p_priority)
  and (coalesce(p_assigned,'')='' or (p_assigned='me' and t.assigned_to=auth.uid()) or (p_assigned='none' and t.assigned_to is null))
  order by t.updated_at desc,t.id desc limit 20 offset (v_page-1)*20)
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'number',t.number,'title',t.title,'category',t.category,'status',t.status,
  'priority',t.priority,'created_at',t.created_at,'updated_at',t.updated_at,
  'requester',case when coalesce(p_staff,false) then coalesce(p.full_name,'') else null end,
  'assignee',case when coalesce(p_staff,false) then coalesce(a.full_name,'') else null end,
  'unread',(select count(*) from public.support_messages m where m.ticket_id=t.id and m.author_id is distinct from auth.uid()
   and (coalesce(p_staff,false) or not m.internal) and m.created_at>coalesce((select last_read_at from public.support_reads r where r.ticket_id=t.id and r.user_id=auth.uid()),'-infinity'::timestamptz))) order by t.updated_at desc,t.id desc),'[]')
 into v_items from filtered t left join public.profiles p on p.id=t.created_by left join public.profiles a on a.id=t.assigned_to;
 return jsonb_build_object('items',v_items,'total',v_total,'page',v_page,'pages',greatest(1,ceil(v_total/20.0)::integer),'stats',v_stats);
end $$;

create function private.support_detail(p_ticket uuid,p_staff boolean,p_before uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare t public.support_tickets; v_messages jsonb; v_events jsonb; v_staff boolean:=coalesce(p_staff,false); v_count integer;
 v_cursor public.support_messages; v_staff_options jsonb; v_ticket jsonb;
begin
 if not private.support_active_user() or (v_staff and not private.support_staff()) then raise insufficient_privilege; end if;
 select * into t from public.support_tickets where id=p_ticket and (v_staff or created_by=auth.uid());
 if not found then raise insufficient_privilege; end if;
 if p_before is not null then
  select * into v_cursor from public.support_messages where id=p_before and ticket_id=t.id and (not internal or v_staff);
  if not found then raise exception 'SUPPORT_INVALID'; end if;
 end if;
 with batch as (select m.* from public.support_messages m where m.ticket_id=t.id and (not m.internal or v_staff)
  and (p_before is null or (m.created_at,m.id)<(v_cursor.created_at,v_cursor.id)) order by m.created_at desc,m.id desc limit 51)
 select count(*) into v_count from batch;
 with batch as (select m.* from public.support_messages m where m.ticket_id=t.id and (not m.internal or v_staff)
  and (p_before is null or (m.created_at,m.id)<(v_cursor.created_at,v_cursor.id)) order by m.created_at desc,m.id desc limit 50)
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'internal',m.internal,'created_at',m.created_at,
  'author',case when m.author_id=t.created_by then 'requester' else 'support' end,
  'author_name',case when v_staff or m.author_id=t.created_by then coalesce(p.full_name,'') else '' end,
  'files',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'bytes',a.bytes)) from public.support_attachments a where a.message_id=m.id),'[]'))
  order by m.created_at,m.id),'[]') into v_messages from batch m left join public.profiles p on p.id=m.author_id;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]') into v_events from (
  select e.id,e.kind,e.before_value,e.after_value,e.created_at,case when v_staff then (select full_name from public.profiles where id=e.actor_id) else null end as actor_name from public.support_events e where e.ticket_id=t.id
   and (v_staff or e.kind in ('created','status')) order by e.created_at desc,e.id desc limit 100) e;
 if v_staff then select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'')) order by p.full_name,p.id),'[]')
  into v_staff_options from public.profiles p where private.support_staff(p.id); end if;
 v_ticket:=jsonb_build_object('id',t.id,'number',t.number,'title',t.title,'category',t.category,'status',t.status,'priority',t.priority,
  'course_id',t.course_id,'course_title',(select title from public.courses where id=t.course_id),
  'order_id',t.order_id,'assigned_to',t.assigned_to,'version',t.version,'created_at',t.created_at,'updated_at',t.updated_at,
  'requester',case when v_staff then (select full_name from public.profiles where id=t.created_by) else null end);
 return jsonb_build_object('ticket',v_ticket,'messages',v_messages,'hasMore',v_count>50,'events',v_events,'staff',coalesce(v_staff_options,'[]'));
end $$;

-- Public API wrappers delegate to checked, non-exposed transaction functions.
create function public.support_create_ticket(p_request uuid,p_title text,p_body text,p_category text,p_course uuid default null,p_order uuid default null)
 returns uuid language sql security invoker set search_path='' as $$select private.support_create(p_request,p_title,p_body,p_category,p_course,p_order)$$;
create function public.support_reply(p_ticket uuid,p_request uuid,p_body text,p_internal boolean default false,p_files uuid[] default '{}')
 returns uuid language sql security invoker set search_path='' as $$select private.support_reply(p_ticket,p_request,p_body,p_internal,p_files)$$;
create function public.support_update_ticket(p_ticket uuid,p_version bigint,p_status text,p_priority text,p_assignee uuid default null)
 returns boolean language sql security invoker set search_path='' as $$select private.support_update(p_ticket,p_version,p_status,p_priority,p_assignee)$$;
create function public.support_reserve_file(p_ticket uuid,p_name text,p_mime text,p_bytes integer)
 returns jsonb language sql security invoker set search_path='' as $$select private.support_reserve_file(p_ticket,p_name,p_mime,p_bytes)$$;
create function public.support_finish_file(p_id uuid,p_cancel boolean default false)
 returns boolean language sql security invoker set search_path='' as $$select private.support_finish_file(p_id,p_cancel)$$;
create function public.support_list_tickets(p_staff boolean default false,p_query text default '',p_status text default '',p_category text default '',p_priority text default '',p_assigned text default '',p_page integer default 1)
 returns jsonb language sql security invoker set search_path='' as $$select private.support_list(p_staff,p_query,p_status,p_category,p_priority,p_assigned,p_page)$$;
create function public.support_get_ticket(p_ticket uuid,p_staff boolean default false,p_before uuid default null)
 returns jsonb language sql security invoker set search_path='' as $$select private.support_detail(p_ticket,p_staff,p_before)$$;
do $$ declare r record; begin
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.proname in ('support_create','support_reply','support_update','support_reserve_file','support_finish_file','support_list','support_detail',
   'support_mark_read','support_create_ticket','support_update_ticket','support_list_tickets','support_get_ticket') loop
  execute format('revoke all on function %s from public,anon,authenticated',r.signature);
  execute format('grant execute on function %s to authenticated',r.signature);
 end loop;
end $$;
