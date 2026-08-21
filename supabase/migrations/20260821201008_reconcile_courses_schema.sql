-- Reconcile the courses schema with the current remote database.
-- These columns already exist remotely but were missing from the
-- original courses migration committed to the repository.

alter table public.courses
  add column if not exists category text;

alter table public.lessons
  add column if not exists duration text;
