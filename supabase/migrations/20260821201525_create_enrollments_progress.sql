-- ============================================================
-- Enrollments + Lesson Progress
-- Educational Platform MVP
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enrollments
-- Links a student profile to a course.
-- ------------------------------------------------------------

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  enrolled_at timestamptz not null default now(),

  constraint enrollments_student_course_unique
    unique (student_id, course_id)
);

create index enrollments_course_id_idx
  on public.enrollments(course_id);


-- ------------------------------------------------------------
-- 2. Lesson Progress
-- Stores the completion state of a lesson for an enrollment.
-- ------------------------------------------------------------

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),

  enrollment_id uuid not null
    references public.enrollments(id)
    on delete cascade,

  lesson_id uuid not null
    references public.lessons(id)
    on delete cascade,

  is_completed boolean not null default false,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint lesson_progress_enrollment_lesson_unique
    unique (enrollment_id, lesson_id)
);

create index lesson_progress_lesson_id_idx
  on public.lesson_progress(lesson_id);


-- ------------------------------------------------------------
-- 3. Validate that the lesson belongs to the enrollment course.
-- Prevents invalid progress records across different courses.
-- ------------------------------------------------------------

create or replace function public.validate_lesson_progress_course()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.enrollments e
    join public.lessons l
      on l.id = new.lesson_id
    join public.sections s
      on s.id = l.section_id
    where e.id = new.enrollment_id
      and e.course_id = s.course_id
  ) then
    raise exception
      'Lesson does not belong to the course of this enrollment';
  end if;

  return new;
end;
$$;

create trigger validate_lesson_progress_course
before insert or update of enrollment_id, lesson_id
on public.lesson_progress
for each row
execute function public.validate_lesson_progress_course();


-- ------------------------------------------------------------
-- 4. Automatically maintain lesson progress timestamps.
-- ------------------------------------------------------------

create or replace function public.set_lesson_progress_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if new.is_completed then
    if tg_op = 'INSERT'
       or old.is_completed is distinct from true then
      new.completed_at = now();
    end if;
  else
    new.completed_at = null;
  end if;

  return new;
end;
$$;

create trigger set_lesson_progress_timestamps
before insert or update of is_completed
on public.lesson_progress
for each row
execute function public.set_lesson_progress_timestamps();


-- ------------------------------------------------------------
-- 5. Enable Row Level Security.
-- ------------------------------------------------------------

alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;


-- ------------------------------------------------------------
-- 6. Privileges
-- ------------------------------------------------------------

revoke all on table public.enrollments from anon;
revoke all on table public.enrollments from authenticated;

grant select
  on table public.enrollments
  to authenticated;

grant insert (student_id, course_id)
  on table public.enrollments
  to authenticated;

grant delete
  on table public.enrollments
  to authenticated;

grant all
  on table public.enrollments
  to service_role;


revoke all on table public.lesson_progress from anon;
revoke all on table public.lesson_progress from authenticated;

grant select
  on table public.lesson_progress
  to authenticated;

grant insert (enrollment_id, lesson_id, is_completed)
  on table public.lesson_progress
  to authenticated;

grant update (is_completed)
  on table public.lesson_progress
  to authenticated;

grant all
  on table public.lesson_progress
  to service_role;


-- ------------------------------------------------------------
-- 7. Enrollments RLS Policies
-- ------------------------------------------------------------

create policy "Students can view their own enrollments"
on public.enrollments
for select
to authenticated
using (
  student_id = (select auth.uid())
);


create policy "Students can enroll themselves in published courses"
on public.enrollments
for insert
to authenticated
with check (
  student_id = (select auth.uid())

  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'student'
  )

  and exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.is_published = true
  )
);


create policy "Students can delete their own enrollments"
on public.enrollments
for delete
to authenticated
using (
  student_id = (select auth.uid())
);


-- ------------------------------------------------------------
-- 8. Lesson Progress RLS Policies
-- ------------------------------------------------------------

create policy "Students can view their own lesson progress"
on public.lesson_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_id
      and e.student_id = (select auth.uid())
  )
);


create policy "Students can create their own lesson progress"
on public.lesson_progress
for insert
to authenticated
with check (
  exists (
    select 1
    from public.enrollments e
    join public.lessons l
      on l.id = lesson_id
    join public.sections s
      on s.id = l.section_id
    where e.id = enrollment_id
      and e.student_id = (select auth.uid())
      and e.course_id = s.course_id
  )
);


create policy "Students can update their own lesson progress"
on public.lesson_progress
for update
to authenticated
using (
  exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_id
      and e.student_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.enrollments e
    join public.lessons l
      on l.id = lesson_id
    join public.sections s
      on s.id = l.section_id
    where e.id = enrollment_id
      and e.student_id = (select auth.uid())
      and e.course_id = s.course_id
  )
);
