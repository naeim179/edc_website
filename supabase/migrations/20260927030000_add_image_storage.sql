-- General image storage

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'images',
  'images',
  true
)
on conflict (id) do nothing;


drop policy if exists "images public read" on storage.objects;

create policy "images public read"
on storage.objects
for select
to public
using (
  bucket_id = 'images'
);


drop policy if exists "authenticated upload images" on storage.objects;

create policy "authenticated upload images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
);


drop policy if exists "users delete own images" on storage.objects;

create policy "users delete own images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
);

