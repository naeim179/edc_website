begin;

insert into auth.users(id,email) values
 ('a5100000-0000-4000-8000-000000000001','expired-assignments@example.test'),
 ('a5100000-0000-4000-8000-000000000002','active-assignments@example.test'),
 ('a5100000-0000-4000-8000-000000000003','assignment-teacher@example.test');
update public.profiles set role='teacher' where id='a5100000-0000-4000-8000-000000000003';
insert into public.courses(id,title,course_type,price,is_free,is_published) values
 ('a5200000-0000-4000-8000-000000000001','Paid assignments','group',25,false,true),
 ('a5200000-0000-4000-8000-000000000002','Free assignments','group',0,true,true);
insert into public.enrollments(course_id,student_id) values
 ('a5200000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000001'),
 ('a5200000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000002'),
 ('a5200000-0000-4000-8000-000000000002','a5100000-0000-4000-8000-000000000001');
insert into public.subscriptions(course_id,student_id,duration_months,amount,currency,status,expires_at) values
 ('a5200000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000001',1,25,'USD','active',now()-interval '1 day'),
 ('a5200000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000002',1,0,'USD','active',now()+interval '1 day');
insert into public.course_instructors(course_id,teacher_id)
values ('a5200000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000003');
insert into public.assignments(id,course_id,title,instructions) values
 ('a5300000-0000-4000-8000-000000000001','a5200000-0000-4000-8000-000000000001','Paid assignment','Paid instructions'),
 ('a5300000-0000-4000-8000-000000000002','a5200000-0000-4000-8000-000000000001','Unsent draft','Draft instructions'),
 ('a5300000-0000-4000-8000-000000000003','a5200000-0000-4000-8000-000000000002','Free assignment','Free instructions');
insert into public.assignment_submissions(assignment_id,student_id,status,score,feedback,submitted_at) values
 ('a5300000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000001','graded',78,'Own feedback',now()-interval '2 days'),
 ('a5300000-0000-4000-8000-000000000001','a5100000-0000-4000-8000-000000000002','graded',81,'Other feedback',now()-interval '2 days'),
 ('a5300000-0000-4000-8000-000000000002','a5100000-0000-4000-8000-000000000001','draft',null,null,null);
insert into storage.objects(bucket_id,name)
values ('assignment-files','resources/a5200000-0000-4000-8000-000000000001/a5300000-0000-4000-8000-000000000001/paid.pdf');

set local role authenticated;
set local request.jwt.claim.sub = 'a5100000-0000-4000-8000-000000000001';
do $$
declare result jsonb;
begin
  if (select count(*) from public.assignments) <> 1 then raise exception 'Expired student read paid instructions or lost free access'; end if;
  if exists (select 1 from storage.objects where bucket_id='assignment-files') then raise exception 'Expired student read paid resources'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('assignment-files',
      'submissions/a5200000-0000-4000-8000-000000000001/a5300000-0000-4000-8000-000000000002/a5100000-0000-4000-8000-000000000001/expired.pdf');
    raise exception 'Expired student uploaded a file';
  exception when insufficient_privilege then null;
  end;
  select to_jsonb(h) into result from public.read_student_assignment_history() h;
  if (select count(*) from public.read_student_assignment_history()) <> 1
    or result->>'score' is distinct from '78.00'
    or result->>'feedback' is distinct from 'Own feedback'
    or result->>'course_access' is distinct from 'false'
    or result ?| array['instructions','resources_json','content_json'] then
    raise exception 'Expired student history was lost or contains private course or peer data';
  end if;
  if exists(select 1 from public.read_student_assignment_history('a5300000-0000-4000-8000-000000000002')) then
    raise exception 'Unsent draft should be hidden until renewal';
  end if;
  if has_function_privilege('authenticated','public.write_assignment_submission(uuid,uuid,jsonb,boolean)','execute')
    or has_function_privilege('anon','public.read_student_assignment_history(uuid)','execute') then
    raise exception 'Assignment function grants are too broad';
  end if;
end;
$$;

set local request.jwt.claim.sub = 'a5100000-0000-4000-8000-000000000002';
do $$
begin
  if (select count(*) from public.assignments) <> 2 then raise exception 'Active zero-amount subscription did not grant paid access'; end if;
  if not exists (select 1 from storage.objects where bucket_id='assignment-files') then raise exception 'Active student lost resources'; end if;
  if exists (select 1 from public.read_student_assignment_history() where feedback <> 'Other feedback') then
    raise exception 'History showed another student’s feedback';
  end if;
end;
$$;

set local storage.operation = 'storage.object.sign';
do $$
begin
  if exists (select 1 from storage.objects where bucket_id='assignment-files') then
    raise exception 'Student could mint a reusable signed URL for paid resources';
  end if;
end;
$$;

set local request.jwt.claim.sub = 'a5100000-0000-4000-8000-000000000003';
do $$
begin
  if (select count(*) from public.assignments) <> 2 then raise exception 'Assigned teacher lost access'; end if;
  if (select count(*) from public.assignment_submissions) <> 3 then raise exception 'Teacher lost submissions from expired students'; end if;
  if not exists (select 1 from storage.objects where bucket_id='assignment-files') then
    raise exception 'Assigned teacher cannot sign a resource URL';
  end if;
end;
$$;
set local storage.operation = '';

reset role;
set local request.jwt.claim.sub = '';
do $$
declare should_submit boolean;
begin
  foreach should_submit in array array[false,true] loop
    begin
      perform public.write_assignment_submission('a5300000-0000-4000-8000-000000000002',
        'a5100000-0000-4000-8000-000000000001','{"text":"late write"}',should_submit);
      raise exception 'Expired student wrote a draft or submitted';
    exception when insufficient_privilege then
      if sqlerrm <> 'ASSIGNMENT_ACCESS_REQUIRED' then raise; end if;
    end;
  end loop;
  perform public.write_assignment_submission('a5300000-0000-4000-8000-000000000003',
    'a5100000-0000-4000-8000-000000000001','{"text":"free answer"}',true);
end;
$$;

update public.subscriptions set expires_at=now()+interval '1 day'
where student_id='a5100000-0000-4000-8000-000000000001';
select public.write_assignment_submission('a5300000-0000-4000-8000-000000000002',
  'a5100000-0000-4000-8000-000000000001','{"text":"after renewal"}',true);
set local role authenticated;
set local request.jwt.claim.sub = 'a5100000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.assignments) <> 3 then raise exception 'Renewal did not restore access'; end if;
  if not exists (select 1 from storage.objects where bucket_id='assignment-files') then raise exception 'Renewal did not restore resource access'; end if;
  if (select status from public.read_student_assignment_history('a5300000-0000-4000-8000-000000000002')) is distinct from 'submitted' then
    raise exception 'Renewal did not allow the saved draft to be submitted';
  end if;
end;
$$;

rollback;
