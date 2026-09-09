-- Allow authenticated admins to manage lessons

grant select, insert, update, delete
on table public.lessons
to authenticated;


drop policy if exists "Admins can manage lessons"
on public.lessons;


create policy "Admins can manage lessons"
on public.lessons
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);
