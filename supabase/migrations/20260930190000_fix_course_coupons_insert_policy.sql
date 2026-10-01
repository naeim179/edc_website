
drop policy if exists "Admins can manage course coupons"
on public.course_coupons;


create policy "Admins can manage course coupons"
on public.course_coupons
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

