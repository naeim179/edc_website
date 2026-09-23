drop function if exists public.get_course_lesson_catalog(uuid);

create function public.get_course_lesson_catalog(
  p_course_id uuid
)
returns table (
  id uuid,
  section_id uuid,
  course_id uuid,
  title text,
  duration text,
  is_free_preview boolean,
  order_index integer,
  section_order_index integer,
  video_provider text,
  youtube_video_id text,
  mux_asset_id text,
  mux_playback_id text,
  bunny_library_id text,
  bunny_video_id text
)
language sql
stable
security definer
set search_path = public
as $$
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
    l.bunny_video_id
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
$$;

revoke all
on function public.get_course_lesson_catalog(uuid)
from public;

grant execute
on function public.get_course_lesson_catalog(uuid)
to anon, authenticated, service_role;
