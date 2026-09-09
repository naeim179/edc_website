-- Authenticated users may access sections at table privilege level.
-- RLS determines what each user is actually allowed to do.

grant select, insert, update, delete
on table public.sections
to authenticated;


drop policy if exists "Admins can insert sections" on public.sections;
create policy "Admins can insert sections"
on public.sections
for insert
to authenticated
with check (public.is_admin());


drop policy if exists "Admins can update sections" on public.sections;
create policy "Admins can update sections"
on public.sections
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists "Admins can delete sections" on public.sections;
create policy "Admins can delete sections"
on public.sections
for delete
to authenticated
using (public.is_admin());
