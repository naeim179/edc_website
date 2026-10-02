-- Allow logged-in users to maintain their own presence row.
-- RLS still guarantees that each user can only modify their own row.

revoke all
on table public.user_presence
from anon;

grant select, insert, update
on table public.user_presence
to authenticated;

grant all
on table public.user_presence
to service_role;
