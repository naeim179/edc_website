create function private.student_can_work_on_course(p_student_id uuid, p_course_id uuid, p_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    join public.profiles p on p.id = e.student_id and p.role = 'student'
    join public.courses c on c.id = e.course_id
    where e.student_id = p_student_id and e.course_id = p_course_id
      and (c.is_free or exists (
        select 1 from public.subscriptions s
        where s.student_id = e.student_id and s.course_id = e.course_id
          and s.status = 'active' and (s.expires_at is null or s.expires_at > p_at)
      ))
  );
$$;
revoke all on function private.student_can_work_on_course(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.assignment_can_manage_course_text(p_course_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.assignment_is_admin() or exists (
    select 1 from public.course_instructors ci
    join public.profiles p on p.id = ci.teacher_id and p.role = 'teacher'
    where ci.teacher_id = (select auth.uid())
      and ci.course_id::text = p_course_id
  );
$$;

create or replace function public.assignment_can_view_course_text(p_course_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.assignment_can_manage_course_text(p_course_id)
    or exists (
      select 1 from public.enrollments e
      where e.student_id = (select auth.uid()) and e.course_id::text = p_course_id
        and private.student_can_work_on_course(e.student_id, e.course_id, statement_timestamp())
    );
$$;

-- The existing restrictive policies also use this helper for assignment files
-- and student uploads. An expired subscription cannot authorize a fresh read.
create or replace function public.assignment_can_view_assignment_text(p_assignment_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    where a.id = case when p_assignment_id ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then p_assignment_id::uuid end
      and (public.assignment_can_manage_course_text(a.course_id::text) or (
        a.is_published
        and (a.target_student_id is null or a.target_student_id = (select auth.uid()))
        and private.student_can_work_on_course((select auth.uid()), a.course_id, statement_timestamp())
      ))
  );
$$;

-- Paid instructor resources use authenticated downloads for students so each
-- download reevaluates access instead of relying on a reusable signed URL.
create policy assignment_paid_resource_signed_url_guard on storage.objects
as restrictive for select to authenticated
using (
  bucket_id <> 'assignment-files'
  or split_part(name, '/', 1) <> 'resources'
  or not (select storage.allow_any_operation(array['object.sign', 'object.sign_many']::text[]))
  or public.assignment_can_manage_course_text(split_part(name, '/', 2))
  or exists (
    select 1 from public.courses c
    where c.id::text = split_part(name, '/', 2) and c.is_free
  )
);

create or replace function public.write_assignment_submission(
  p_assignment_id uuid, p_student_id uuid, p_content jsonb, p_submit boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  assignment public.assignments%rowtype;
  submission public.assignment_submissions%rowtype;
  next_status text;
  attempts integer;
  late boolean;
  checked_at timestamptz;
begin
  select * into assignment from public.assignments where id = p_assignment_id for update;
  if not found or not assignment.is_published
      or (assignment.target_student_id is not null and assignment.target_student_id is distinct from p_student_id) then
    raise exception 'Assignment not found';
  end if;

  -- Coordinate with subscription changes and enrollment removal. Read the
  -- clock after waiting for locks so an expired draft cannot become a submission.
  perform 1 from public.subscriptions where student_id = p_student_id and course_id = assignment.course_id for share;
  perform 1 from public.enrollments where student_id = p_student_id and course_id = assignment.course_id for share;
  select * into submission from public.assignment_submissions
  where assignment_id = assignment.id and student_id = p_student_id for update;
  checked_at := clock_timestamp();
  if not private.student_can_work_on_course(p_student_id, assignment.course_id, checked_at) then
    raise insufficient_privilege using message = 'ASSIGNMENT_ACCESS_REQUIRED';
  end if;

  attempts := coalesce(submission.attempt_number, 0);
  if submission.status = 'graded' or (not p_submit and submission.status in ('submitted', 'late')) then
    raise exception 'Submission is locked';
  end if;
  late := assignment.due_at is not null and checked_at > assignment.due_at;
  if p_submit then
    if assignment.max_attempts > 0 and attempts >= assignment.max_attempts then raise exception 'No attempts remaining'; end if;
    if late and not assignment.allow_late then raise exception 'Deadline closed'; end if;
    if coalesce(p_content->>'text', '') = ''
        and coalesce(jsonb_array_length(p_content->'links'), 0) = 0
        and coalesce(jsonb_array_length(p_content->'files'), 0) = 0
        and coalesce(jsonb_array_length(p_content->'audio'), 0) = 0 then
      raise exception 'Empty submission';
    end if;
    attempts := attempts + 1;
    next_status := case when late then 'late' else 'submitted' end;
  else
    next_status := case when submission.status = 'returned' then 'returned' else 'draft' end;
  end if;
  insert into public.assignment_submissions (
    assignment_id, student_id, content_json, status, attempt_number, submitted_at,
    score, graded_at, graded_by, revision, updated_at
  ) values (
    assignment.id, p_student_id, p_content, next_status, attempts,
    case when p_submit then checked_at else submission.submitted_at end,
    null, null, null, coalesce(submission.revision, 0) + 1, checked_at
  )
  on conflict (assignment_id, student_id) do update set
    content_json = excluded.content_json, status = excluded.status, attempt_number = excluded.attempt_number,
    submitted_at = excluded.submitted_at, score = excluded.score, graded_at = excluded.graded_at,
    graded_by = excluded.graded_by, revision = excluded.revision, updated_at = excluded.updated_at;
  return jsonb_build_object('status', next_status, 'attempt_number', attempts);
end;
$$;
revoke all on function public.write_assignment_submission(uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.write_assignment_submission(uuid, uuid, jsonb, boolean) to service_role;

-- Expose only the caller's past results. Assignment instructions, resources,
-- and unsent drafts remain outside this projection.
create function private.read_student_assignment_history(p_assignment_id uuid)
returns table (
  assignment_id uuid, course_id uuid, course_title text, assignment_title text, status text,
  max_score numeric, score numeric, feedback text, submitted_at timestamptz, course_access boolean
)
language sql stable security definer set search_path = '' as $$
  select a.id, c.id, c.title::text, a.title, s.status, a.max_score, s.score, s.feedback, s.submitted_at,
         private.student_can_work_on_course(s.student_id, c.id, statement_timestamp())
  from public.assignment_submissions s
  join public.profiles p on p.id = s.student_id and p.role = 'student'
  join public.assignments a on a.id = s.assignment_id
  join public.courses c on c.id = a.course_id
  where s.student_id = (select auth.uid())
    and (p_assignment_id is null or s.assignment_id = p_assignment_id)
    and (s.submitted_at is not null or s.status in ('submitted', 'late', 'graded', 'returned'))
  order by s.submitted_at desc nulls last, s.assignment_id;
$$;

create function public.read_student_assignment_history(p_assignment_id uuid default null)
returns table (
  assignment_id uuid, course_id uuid, course_title text, assignment_title text, status text,
  max_score numeric, score numeric, feedback text, submitted_at timestamptz, course_access boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.read_student_assignment_history(p_assignment_id);
$$;

revoke all on function private.read_student_assignment_history(uuid), public.read_student_assignment_history(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.read_student_assignment_history(uuid), public.read_student_assignment_history(uuid)
  to authenticated;
