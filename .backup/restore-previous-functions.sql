-- Only for a coordinated rollback to the pre-security application.
-- Restores previous function behavior; it does not restore customer data.
begin;
CREATE OR REPLACE FUNCTION public.can_read_lesson(p_section_id uuid, p_is_free_preview boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce(p_is_free_preview, false)

    or exists (
      select 1
      from public.sections s
      join public.courses c
        on c.id = s.course_id
      where s.id = p_section_id
        and (
          -- Admin
          exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          )

          -- Assigned instructor
          or exists (
            select 1
            from public.course_instructors ci
            where ci.course_id = c.id
              and ci.teacher_id = auth.uid()
          )

          -- Legacy/direct instructor column
          or c.instructor_id = auth.uid()

          -- Free course enrollment
          or (
            coalesce(c.is_free, false) = true
            and exists (
              select 1
              from public.enrollments e
              where e.student_id = auth.uid()
                and e.course_id = c.id
            )
          )

          -- Active paid subscription
          or (
            coalesce(c.is_free, false) = false
            and exists (
              select 1
              from public.subscriptions sub
              where sub.student_id = auth.uid()
                and sub.course_id = c.id
                and sub.status = 'active'
                and (
                  sub.expires_at is null
                  or sub.expires_at > now()
                )
            )
          )
        )
    );
$function$


CREATE OR REPLACE FUNCTION public.get_course_lesson_catalog(p_course_id uuid)
 RETURNS TABLE(id uuid, section_id uuid, course_id uuid, title text, duration text, is_free_preview boolean, order_index integer, section_order_index integer, video_provider text, youtube_video_id text, mux_asset_id text, mux_playback_id text, bunny_library_id text, bunny_video_id text, lesson_type text, live_platform text, live_schedule text, content_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    l.id,
    l.section_id,
    s.course_id,
    l.title,
    l.duration::text,
    coalesce(l.is_free_preview, false),
    l.order_index,
    s.order_index,
    l.video_provider,
    l.youtube_video_id,
    l.mux_asset_id,
    l.mux_playback_id,
    l.bunny_library_id,
    l.bunny_video_id,
    l.lesson_type,
    l.live_platform,
    l.live_schedule,
    l.content_url
  from public.lessons l
  join public.sections s
    on s.id = l.section_id
  join public.courses c
    on c.id = s.course_id
  where s.course_id = p_course_id
    and c.is_published = true
  order by
    s.order_index,
    l.order_index;
$function$


CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$function$


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'username'), '')
  );
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$function$

commit;
