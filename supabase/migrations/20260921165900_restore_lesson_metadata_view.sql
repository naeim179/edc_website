-- The first catalog RPC also referenced provider columns before their later
-- ADD COLUMN IF NOT EXISTS migrations. Restore that chronological prerequisite.
alter table public.lessons
  add column if not exists video_provider text,
  add column if not exists youtube_video_id text,
  add column if not exists mux_asset_id text,
  add column if not exists mux_playback_id text;

-- Historical deployments created this view outside migrations. Reconstruct it
-- for a fresh database before the following migration hardens its privileges.
-- Preserve any existing remote definition; the final security migration also
-- enforces security_invoker and content RLS.
do $$ begin
  if to_regclass('public.lessons_public') is null then
    execute 'create view public.lessons_public with (security_invoker = true) as
      select id, section_id, title, duration, is_free_preview, order_index
      from public.lessons';
  end if;
end $$;
