create table public.bunny_video_uploads (
  video_id text primary key,
  library_id text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bunny_video_uploads enable row level security;
revoke all on public.bunny_video_uploads from public, anon, authenticated;
grant select, insert, delete on public.bunny_video_uploads to service_role;
-- Existing videos remain playable. Only newly registered upload targets may
-- be overwritten; legacy videos are deliberately not inferred from form data.
