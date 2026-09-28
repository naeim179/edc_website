-- Payment proof storage bucket

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'payment-proofs',
  'payment-proofs',
  false
)
on conflict (id) do nothing;


-- Users can upload their own payment proof
create policy "Users upload payment proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- Users can view their own payment proofs
create policy "Users view own payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- Admin/service can manage proofs
create policy "Service manages payment proofs"
on storage.objects
for all
to service_role
using (
  bucket_id = 'payment-proofs'
)
with check (
  bucket_id = 'payment-proofs'
);
