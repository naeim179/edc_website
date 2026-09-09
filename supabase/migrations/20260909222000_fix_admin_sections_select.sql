grant select
on table public.sections
to authenticated;

drop policy if exists "Admins can view all sections"
on public.sections;

create policy "Admins can view all sections"
on public.sections
for select
to authenticated
using (
  public.is_admin()
);
