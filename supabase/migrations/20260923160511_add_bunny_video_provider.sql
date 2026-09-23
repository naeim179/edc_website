-- ============================================================
-- Add Bunny Stream as a lesson video provider
-- Keep existing YouTube + Mux support
-- ============================================================


-- 1) Add Bunny fields
alter table public.lessons
add column if not exists bunny_library_id text null;

alter table public.lessons
add column if not exists bunny_video_id text null;


-- 2) Update allowed providers
alter table public.lessons
drop constraint if exists lessons_video_provider_check;


alter table public.lessons
add constraint lessons_video_provider_check
check (
  video_provider is null
  or video_provider in (
    'youtube',
    'mux',
    'bunny'
  )
);


-- 3) Documentation
comment on column public.lessons.bunny_library_id
is 'Bunny Stream Video Library ID';

comment on column public.lessons.bunny_video_id
is 'Bunny Stream Video ID used for playback';

