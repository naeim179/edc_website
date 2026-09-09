-- Allow authenticated requests to attempt DELETE on lesson_progress.
-- RLS still controls who can actually delete.
-- Currently only admins have a DELETE policy.

grant delete
on table public.lesson_progress
to authenticated;
