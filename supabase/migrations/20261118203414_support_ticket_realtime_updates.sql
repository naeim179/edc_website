-- Existing SELECT policies still restrict events to the owner and support staff.
-- Do not replicate message bodies, internal notes, files or read receipts.
do $$
begin
 if not exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public' and tablename='support_tickets'
 ) then
  alter publication supabase_realtime add table public.support_tickets;
 end if;
end $$;
