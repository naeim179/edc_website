-- Support exactly two lesson video providers:
-- YouTube and Mux.
--
-- content_url remains temporarily for backward compatibility.

alter table public.lessons
add column if not exists video_provider text null;

alter table public.lessons
add column if not exists youtube_video_id text null;

alter table public.lessons
add column if not exists mux_asset_id text null;

alter table public.lessons
add column if not exists mux_playback_id text null;

alter table public.lessons
add constraint lessons_video_provider_check
check (
  video_provider is null
  or video_provider in ('youtube', 'mux')
);

comment on column public.lessons.video_provider
is 'Video provider: youtube or mux';

comment on column public.lessons.youtube_video_id
is 'YouTube video ID, for example dQw4w9WgXcQ';

comment on column public.lessons.mux_asset_id
is 'Mux asset ID used for administration and processing';

comment on column public.lessons.mux_playback_id
is 'Mux signed playback ID used to play the lesson';

comment on column public.lessons.content_url
is 'Legacy lesson content URL. Kept temporarily during migration to provider-based video fields.';
