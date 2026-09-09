-- Ensure authenticated users have table privileges.
-- RLS below still restricts management to admins.

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.sections
to authenticated;

grant execute
on function public.is_admin()
to authenticated;


-- Rebuild admin section policies.

drop policy if exists "Admins can insert sections"
on public.sections;

drop policy if exists "Admins can update sections"
on public.sections;

drop policy if exists "Admins can delete sections"
on public.sections;


create policy "Admins can insert sections"
on public.sections
for insert
to authenticated
with check (
  public.is_admin()
);


create policy "Admins can update sections"
on public.sections
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy "Admins can delete sections"
on public.sections
for delete
to authenticated
using (
  public.is_admin()
);
