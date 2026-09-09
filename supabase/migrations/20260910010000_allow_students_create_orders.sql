-- Allow authenticated students to create their own orders

create policy "Users can create own orders"
on public.orders
for insert
to authenticated
with check (
  auth.uid() = user_id
);


-- Allow admins to view all orders
create policy "Admins can view all orders"
on public.orders
for select
to authenticated
using (
  public.is_admin()
  or auth.uid() = user_id
);
