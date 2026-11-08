-- Fence queued renewals; the begin RPC is the durable start of a payment.
alter table public.subscriptions add column renewal_claim_id uuid,
 add column renewal_cancel_version bigint not null default 0;
alter table public.orders add column renewal_cancel_version bigint;

create function public.claim_subscription_renewals_v2(p_limit integer default 50)
returns table(subscription_id uuid,claim_id uuid)
language plpgsql security definer set search_path=public as $$
begin
 return query with due as (
  select s.id from subscriptions s join subscription_payment_tokens t on t.subscription_id=s.id
  where s.auto_renew and s.status='active' and s.expires_at<=now()+interval '24 hours'
   and (s.renewal_attempted_at is null or s.renewal_attempted_at<now()-interval '20 hours')
   and not exists(select 1 from orders o where o.user_id=s.student_id and o.course_id=s.course_id and o.status='pending')
  order by s.expires_at for update of s skip locked limit least(greatest(coalesce(p_limit,50),1),50)
 ), claimed as (
  update subscriptions s set renewal_claim_id=gen_random_uuid(),renewal_attempted_at=now(),updated_at=now()
  from due where s.id=due.id returning s.id,s.renewal_claim_id
 ) select c.id,c.renewal_claim_id from claimed c;
end $$;

create function public.begin_subscription_renewal(p_subscription_id uuid,p_claim_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s subscriptions%rowtype; t subscription_payment_tokens%rowtype; oid uuid;
begin
 select * into s from subscriptions where id=p_subscription_id for update;
 if not found or not s.auto_renew or s.status<>'active' or s.renewal_claim_id is distinct from p_claim_id
  or p_claim_id is null or s.expires_at is null or s.expires_at>now()+interval '24 hours'
  or exists(select 1 from orders o where o.user_id=s.student_id and o.course_id=s.course_id and o.status='pending') then return null; end if;
 select * into t from subscription_payment_tokens where subscription_id=s.id;
 if not found then return null; end if;
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,auto_renew_requested,source,payment_method,renewal_cancel_version)
 values(s.student_id,s.course_id,s.amount,s.currency,'pending',s.duration_months,true,'auto_renew','paytabs',s.renewal_cancel_version) returning id into oid;
 update subscriptions set renewal_claim_id=null where id=s.id;
 return jsonb_build_object('order_id',oid,'amount',s.amount,'currency',s.currency,'duration_months',s.duration_months,'token',t.token,'token_tran_ref',t.token_tran_ref);
end $$;

create function public.disable_subscription_auto_renew(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s subscriptions%rowtype; in_flight boolean;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select * into s from subscriptions where student_id=auth.uid() and course_id=p_course_id for update;
 if not found then raise exception 'Subscription not found'; end if;
 update subscriptions set auto_renew=false,renewal_claim_id=null,renewal_cancel_version=renewal_cancel_version+1,updated_at=now() where id=s.id;
 delete from subscription_payment_tokens where subscription_id=s.id;
 select exists(select 1 from orders o where o.user_id=s.student_id and o.course_id=s.course_id and o.source='auto_renew' and o.status='pending') into in_flight;
 return jsonb_build_object('in_flight',in_flight);
end $$;
revoke all on function public.claim_subscription_renewals_v2(integer),public.begin_subscription_renewal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_subscription_renewals_v2(integer),public.begin_subscription_renewal(uuid,uuid) to service_role;
revoke all on function public.disable_subscription_auto_renew(uuid) from public,anon;
grant execute on function public.disable_subscription_auto_renew(uuid) to authenticated;

-- A late recurring approval may extend access, but cannot undo opt-out.
do $$ declare def text; needle text := 'and v_effective_token_ref is not null;'; begin
 def:=replace(pg_get_functiondef('public.fulfill_subscription_order(uuid,text,text)'::regprocedure),chr(13),'');
 if length(def)-length(replace(def,needle,''))<>length(needle) then raise exception 'Unexpected fulfillment definition'; end if;
 execute replace(def,needle,'and v_effective_token_ref is not null and (v_order.source <> ''auto_renew'' or coalesce((v_subscription.auto_renew and v_order.renewal_cancel_version = v_subscription.renewal_cancel_version), false));');
end $$;

-- Serializing on the assignment also covers first insert (no submission row yet).
alter table public.assignment_submissions add column revision bigint not null default 0;
create function public.write_assignment_submission(p_assignment_id uuid,p_student_id uuid,p_content jsonb,p_submit boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a assignments%rowtype; s assignment_submissions%rowtype; next_status text; attempts integer; late boolean;
begin
 select * into a from assignments where id=p_assignment_id for update;
 if not found or not a.is_published then raise exception 'Assignment not found'; end if;
 if not exists(select 1 from profiles p where p.id=p_student_id and p.role='student') or not exists(select 1 from enrollments e where e.student_id=p_student_id and e.course_id=a.course_id) then raise exception 'Forbidden'; end if;
 select * into s from assignment_submissions where assignment_id=a.id and student_id=p_student_id for update;
 attempts:=coalesce(s.attempt_number,0);
 if s.status='graded' or (not p_submit and s.status in ('submitted','late')) then raise exception 'Submission is locked'; end if;
 late:=a.due_at is not null and clock_timestamp()>a.due_at;
 if p_submit then
  if a.max_attempts>0 and attempts>=a.max_attempts then raise exception 'No attempts remaining'; end if;
  if late and not a.allow_late then raise exception 'Deadline closed'; end if;
  if coalesce(p_content->>'text','')='' and coalesce(jsonb_array_length(p_content->'links'),0)=0 and coalesce(jsonb_array_length(p_content->'files'),0)=0 and coalesce(jsonb_array_length(p_content->'audio'),0)=0 then raise exception 'Empty submission'; end if;
  attempts:=attempts+1; next_status:=case when late then 'late' else 'submitted' end;
 else next_status:=case when s.status='returned' then 'returned' else 'draft' end; end if;
 insert into assignment_submissions(assignment_id,student_id,content_json,status,attempt_number,submitted_at,score,graded_at,graded_by,revision,updated_at)
 values(a.id,p_student_id,p_content,next_status,attempts,case when p_submit then clock_timestamp() else s.submitted_at end,null,null,null,coalesce(s.revision,0)+1,clock_timestamp())
 on conflict(assignment_id,student_id) do update set content_json=excluded.content_json,status=excluded.status,attempt_number=excluded.attempt_number,submitted_at=excluded.submitted_at,score=excluded.score,graded_at=excluded.graded_at,graded_by=excluded.graded_by,revision=excluded.revision,updated_at=excluded.updated_at;
 return jsonb_build_object('status',next_status,'attempt_number',attempts);
end $$;

create function public.review_assignment_submission(p_assignment_id uuid,p_submission_id uuid,p_teacher_id uuid,p_revision bigint,p_return boolean,p_score numeric,p_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare a assignments%rowtype; s assignment_submissions%rowtype;
begin
 select * into a from assignments where id=p_assignment_id for update;
 if not found then raise exception 'Assignment not found'; end if;
 if not exists(select 1 from course_instructors i where i.course_id=a.course_id and i.teacher_id=p_teacher_id) then raise exception 'Forbidden'; end if;
 select * into s from assignment_submissions where id=p_submission_id and assignment_id=a.id for update;
 if not found then raise exception 'Submission not found'; end if;
 if s.revision is distinct from p_revision then raise exception 'Submission changed; refresh and try again'; end if;
 if s.status not in ('submitted','late','graded') then raise exception 'Submission is locked'; end if;
 if p_return and coalesce(trim(p_feedback),'')='' then raise exception 'Feedback is required'; end if;
 if not p_return and (p_score is null or p_score<0 or p_score>a.max_score or p_score='NaN'::numeric) then raise exception 'Invalid score'; end if;
 update assignment_submissions set status=case when p_return then 'returned' else 'graded' end,
 attempt_number=case when p_return then greatest(0,s.attempt_number-1) else s.attempt_number end,
 score=case when p_return then null else p_score end,feedback=left(p_feedback,5000),
 graded_at=case when p_return then null else clock_timestamp() end,graded_by=case when p_return then null else p_teacher_id end,
 revision=s.revision+1,updated_at=clock_timestamp() where id=s.id;
end $$;
revoke all on function public.write_assignment_submission(uuid,uuid,jsonb,boolean),public.review_assignment_submission(uuid,uuid,uuid,bigint,boolean,numeric,text) from public,anon,authenticated;
grant execute on function public.write_assignment_submission(uuid,uuid,jsonb,boolean),public.review_assignment_submission(uuid,uuid,uuid,bigint,boolean,numeric,text) to service_role;

-- Both inspected indexes have the same keys/predicate and no constraint owner.
do $$ begin
 if exists(select 1 from pg_index a join pg_index b on a.indrelid=b.indrelid and a.indkey=b.indkey and a.indpred::text=b.indpred::text and a.indisunique=b.indisunique
 where a.indexrelid='public.unique_pending_order_per_user_course'::regclass and b.indexrelid='public.orders_one_pending_per_student_course_idx'::regclass)
 then execute 'drop index public.unique_pending_order_per_user_course'; else raise exception 'Pending indexes differ'; end if;
end $$;
