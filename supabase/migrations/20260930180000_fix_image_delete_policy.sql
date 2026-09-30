drop policy if exists "users delete own images" on storage.objects;


create policy "users and admins delete images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and (
    owner_id = auth.uid()::text
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  )
);
