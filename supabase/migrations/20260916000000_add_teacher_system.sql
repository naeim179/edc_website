-- Add teacher role
alter type public.app_role
add value if not exists 'teacher';


-- Course instructors assignment table
create table if not exists public.course_instructors (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  teacher_id uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(course_id, teacher_id)
);


-- Enable RLS
alter table public.course_instructors enable row level security;


-- Grants
grant select, insert, update, delete
on public.course_instructors
to authenticated;


-- Admin full access
create policy "Admins manage course instructors"
on public.course_instructors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- Teacher can view assigned courses
create policy "Teachers view own assignments"
on public.course_instructors
for select
to authenticated
using (
  teacher_id = auth.uid()
);
