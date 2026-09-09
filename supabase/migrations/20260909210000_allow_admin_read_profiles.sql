create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
  )
);
