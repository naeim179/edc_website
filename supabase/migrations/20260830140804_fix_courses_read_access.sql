-- ============================================================
-- Fix read access for published courses, sections, and lessons.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Grant read privileges.
-- RLS policies still determine which rows are visible.
-- ------------------------------------------------------------

grant select
  on table public.courses
  to anon, authenticated;

grant select
  on table public.sections
  to anon, authenticated;

grant select
  on table public.lessons
  to anon, authenticated;


-- ------------------------------------------------------------
-- 2. Courses
-- Keep the existing published-courses policy.
-- ------------------------------------------------------------

-- Existing policy:
-- "الجميع يمكنهم قراءة الدورات المنشورة"
-- using (is_published = true)


-- ------------------------------------------------------------
-- 3. Sections
-- Replace unrestricted reading with access only to sections
-- belonging to published courses.
-- ------------------------------------------------------------

drop policy if exists "قراءة الأقسام متاحة للجميع"
on public.sections;

create policy "Read sections of published courses"
on public.sections
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = sections.course_id
      and c.is_published = true
  )
);


-- ------------------------------------------------------------
-- 4. Lessons
-- Replace unrestricted reading with access only to lessons
-- belonging to published courses.
-- ------------------------------------------------------------

drop policy if exists "قراءة الدروس متاحة للجميع"
on public.lessons;

create policy "Read lessons of published courses"
on public.lessons
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.sections s
    join public.courses c
      on c.id = s.course_id
    where s.id = lessons.section_id
      and c.is_published = true
  )
);
