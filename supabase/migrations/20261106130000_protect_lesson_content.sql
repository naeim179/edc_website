-- Keep the existing RPC shape for rolling deployments, but never return
-- content URLs or provider IDs from the public curriculum catalog.
create or replace function public.get_course_lesson_catalog(p_course_id uuid)
returns table (
  id uuid, section_id uuid, course_id uuid, title text, duration text,
  is_free_preview boolean, order_index integer, section_order_index integer,
  video_provider text, youtube_video_id text, mux_asset_id text,
  mux_playback_id text, bunny_library_id text, bunny_video_id text,
  lesson_type text, live_platform text, live_schedule text, content_url text
)
language sql stable security definer set search_path = public
as $$
  select l.id, l.section_id, s.course_id, l.title, l.duration::text,
    coalesce(l.is_free_preview, false), l.order_index, s.order_index,
    null::text, null::text, null::text, null::text, null::text, null::text,
    l.lesson_type, null::text, null::text, null::text
  from public.lessons l
  join public.sections s on s.id = l.section_id
  join public.courses c on c.id = s.course_id
  where s.course_id = p_course_id and c.is_published = true
  order by s.order_index, l.order_index;
$$;
revoke all on function public.get_course_lesson_catalog(uuid) from public;
grant execute on function public.get_course_lesson_catalog(uuid)
  to anon, authenticated, service_role;

-- Cards need total curriculum counts even though lesson content is now hidden.
create function public.get_course_lesson_counts(p_course_ids uuid[])
returns table (course_id uuid, lesson_count bigint)
language sql stable security definer set search_path = public
as $$
  select c.id, count(l.id)
  from public.courses c
  left join public.sections s on s.course_id = c.id
  left join public.lessons l on l.section_id = s.id
  where c.id = any(p_course_ids) and c.is_published = true
  group by c.id;
$$;
revoke all on function public.get_course_lesson_counts(uuid[]) from public;
grant execute on function public.get_course_lesson_counts(uuid[])
  to anon, authenticated, service_role;

create or replace function public.can_read_lesson(
  p_section_id uuid, p_is_free_preview boolean
)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sections s
    join public.courses c on c.id = s.course_id
    where s.id = p_section_id and (
      exists (select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin')
      or exists (select 1 from public.course_instructors ci
        where ci.course_id = c.id and ci.teacher_id = auth.uid())
      or c.instructor_id = auth.uid()
      or (c.is_published = true and (
        coalesce(p_is_free_preview, false)
        or (coalesce(c.is_free, false) and exists (
          select 1 from public.enrollments e
          where e.student_id = auth.uid() and e.course_id = c.id
        ))
        or (not coalesce(c.is_free, false) and exists (
          select 1 from public.subscriptions sub
          where sub.student_id = auth.uid() and sub.course_id = c.id
            and sub.status = 'active'
            and (sub.expires_at is null or sub.expires_at > now())
        ))
      ))
    )
  );
$$;
revoke all on function public.can_read_lesson(uuid, boolean) from public;
grant execute on function public.can_read_lesson(uuid, boolean)
  to anon, authenticated, service_role;

-- PostgreSQL combines permissive policies using OR. Remove the historical
-- public read policy and add a restrictive guard to cover other old policies.
drop policy if exists "Read lessons of published courses" on public.lessons;
drop policy if exists "قراءة الدروس متاحة للجميع" on public.lessons;
drop policy if exists "Authorized lesson readers" on public.lessons;
create policy "Authorized lesson readers" on public.lessons
  for select to anon, authenticated
  using (public.can_read_lesson(section_id, is_free_preview));
drop policy if exists "Lesson content access guard" on public.lessons;
create policy "Lesson content access guard" on public.lessons
  as restrictive for select to anon, authenticated
  using (public.can_read_lesson(section_id, is_free_preview));

-- A historical remote-only view might exist. Any such view must obey RLS.
do $$ begin
  if to_regclass('public.lessons_public') is not null then
    execute 'alter view public.lessons_public set (security_invoker = true)';
  end if;
end $$;
