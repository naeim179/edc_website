-- ============================================================
-- YOUR WAY ASSIGNMENTS
-- Lightweight DB + private Storage
-- ============================================================

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  title text not null,
  instructions text not null default '',

  due_at timestamptz,

  max_score numeric(8,2) not null default 100
    check (max_score > 0),

  allow_late boolean not null default true,

  -- 0 = unlimited
  max_attempts integer not null default 1
    check (
      max_attempts >= 0
      and max_attempts <= 10
    ),

  -- Teacher resources will also live in Storage.
  -- DB stores metadata/path only.
  resources_json jsonb not null default '[]'::jsonb,

  is_published boolean not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
    references public.assignments(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  -- Text + links + file metadata + audio metadata.
  -- Actual binary files NEVER go inside PostgreSQL.
  content_json jsonb not null default jsonb_build_object(
    'text', '',
    'links', jsonb_build_array(),
    'files', jsonb_build_array(),
    'audio', jsonb_build_array()
  ),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'late',
        'graded',
        'returned'
      )
    ),

  attempt_number integer not null default 0
    check (attempt_number >= 0),

  submitted_at timestamptz,

  score numeric(8,2),
  feedback text,

  graded_at timestamptz,

  graded_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    assignment_id,
    student_id
  )
);


create index if not exists assignments_course_due_idx
on public.assignments (
  course_id,
  due_at
);


create index if not exists assignment_submissions_assignment_idx
on public.assignment_submissions (
  assignment_id,
  status
);


create index if not exists assignment_submissions_student_idx
on public.assignment_submissions (
  student_id,
  status
);


-- ============================================================
-- Permission helpers
-- ============================================================

create or replace function public.assignment_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'admin'
      and (
        p.is_super_admin = true
        or
        'manage_assignments' = any(
          coalesce(
            p.permissions,
            '{}'::text[]
          )
        )
      )
  );
$$;


create or replace function public.assignment_can_manage_course_text(
  p_course_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.assignment_is_admin()
    or exists (
      select 1
      from public.course_instructors ci
      where ci.course_id::text = p_course_id
        and ci.teacher_id = auth.uid()
    );
$$;


create or replace function public.assignment_can_view_course_text(
  p_course_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.assignment_can_manage_course_text(
      p_course_id
    )
    or exists (
      select 1
      from public.enrollments e
      where e.course_id::text = p_course_id
        and e.student_id = auth.uid()
    );
$$;


revoke all
on function public.assignment_is_admin()
from public, anon;

revoke all
on function public.assignment_can_manage_course_text(text)
from public, anon;

revoke all
on function public.assignment_can_view_course_text(text)
from public, anon;


grant execute
on function public.assignment_is_admin()
to authenticated, service_role;

grant execute
on function public.assignment_can_manage_course_text(text)
to authenticated, service_role;

grant execute
on function public.assignment_can_view_course_text(text)
to authenticated, service_role;


-- ============================================================
-- RLS
-- Writes go through secured Server Actions.
-- Authenticated users only receive SELECT access.
-- ============================================================

alter table public.assignments
enable row level security;

alter table public.assignment_submissions
enable row level security;


grant select
on public.assignments
to authenticated;

grant select
on public.assignment_submissions
to authenticated;

grant all
on public.assignments
to service_role;

grant all
on public.assignment_submissions
to service_role;


drop policy if exists
  "assignment visible to course users"
on public.assignments;

create policy
  "assignment visible to course users"
on public.assignments
for select
to authenticated
using (
  public.assignment_can_manage_course_text(
    course_id::text
  )
  or (
    is_published = true
    and public.assignment_can_view_course_text(
      course_id::text
    )
  )
);


drop policy if exists
  "submission visible to owner or course manager"
on public.assignment_submissions;

create policy
  "submission visible to owner or course manager"
on public.assignment_submissions
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    where a.id =
      assignment_submissions.assignment_id
      and public.assignment_can_manage_course_text(
        a.course_id::text
      )
  )
);


-- ============================================================
-- Storage
-- Maximum single file = 25 MB
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'assignment-files',
  'assignment-files',
  false,
  26214400
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 26214400;


-- Path formats:
--
-- Teacher resource:
-- resources/COURSE_ID/ASSIGNMENT_ID/file.ext
--
-- Student submission:
-- submissions/COURSE_ID/ASSIGNMENT_ID/STUDENT_ID/file.ext


drop policy if exists
  "assignment files select"
on storage.objects;

create policy
  "assignment files select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assignment-files'
  and (
    (
      split_part(name, '/', 1) = 'resources'
      and exists (
        select 1
        from public.assignments a
        where a.id::text =
          split_part(name, '/', 3)
          and a.course_id::text =
            split_part(name, '/', 2)
          and public.assignment_can_view_course_text(
            a.course_id::text
          )
      )
    )
    or
    (
      split_part(name, '/', 1) = 'submissions'
      and exists (
        select 1
        from public.assignments a
        where a.id::text =
          split_part(name, '/', 3)
          and a.course_id::text =
            split_part(name, '/', 2)
          and (
            split_part(name, '/', 4) =
              auth.uid()::text
            or public.assignment_can_manage_course_text(
              a.course_id::text
            )
          )
      )
    )
  )
);


drop policy if exists
  "assignment files insert"
on storage.objects;

create policy
  "assignment files insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assignment-files'
  and (
    (
      split_part(name, '/', 1) = 'resources'
      and exists (
        select 1
        from public.assignments a
        where a.id::text =
          split_part(name, '/', 3)
          and a.course_id::text =
            split_part(name, '/', 2)
          and public.assignment_can_manage_course_text(
            a.course_id::text
          )
      )
    )
    or
    (
      split_part(name, '/', 1) = 'submissions'
      and split_part(name, '/', 4) =
        auth.uid()::text
      and exists (
        select 1
        from public.assignments a
        join public.enrollments e
          on e.course_id = a.course_id
        where a.id::text =
          split_part(name, '/', 3)
          and a.course_id::text =
            split_part(name, '/', 2)
          and a.is_published = true
          and e.student_id = auth.uid()
      )
    )
  )
);


drop policy if exists
  "assignment files delete"
on storage.objects;

create policy
  "assignment files delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'assignment-files'
  and (
    (
      split_part(name, '/', 1) = 'resources'
      and public.assignment_can_manage_course_text(
        split_part(name, '/', 2)
      )
    )
    or
    (
      split_part(name, '/', 1) = 'submissions'
      and (
        split_part(name, '/', 4) =
          auth.uid()::text
        or public.assignment_can_manage_course_text(
          split_part(name, '/', 2)
        )
      )
    )
  )
);
