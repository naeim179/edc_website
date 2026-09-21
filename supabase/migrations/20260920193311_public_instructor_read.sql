-- Is this course published?
create or replace function public.is_published_course(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.courses
    where id = cid and is_published = true
  );
$$;

-- Is this user an instructor of at least one published course?
create or replace function public.is_public_instructor(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_instructors ci
    join public.courses c on c.id = ci.course_id
    where ci.teacher_id = pid and c.is_published = true
  );
$$;

drop policy if exists "Anyone can view instructors of published courses" on public.course_instructors;
create policy "Anyone can view instructors of published courses"
on public.course_instructors
for select
to anon, authenticated
using (public.is_published_course(course_id));

drop policy if exists "Anyone can view public instructor profiles" on public.profiles;
create policy "Anyone can view public instructor profiles"
on public.profiles
for select
to anon, authenticated
using (public.is_public_instructor(id));
