-- ============================================
-- Chat Storage
-- ============================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'chat-files',
  'chat-files',
  false
)
on conflict (id) do nothing;


-- View files only for conversation members

drop policy if exists "chat files select" on storage.objects;

create policy "chat files select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and exists (
    select 1
    from conversations c
    where c.id::text = (storage.foldername(name))[1]
    and (
      c.student_id = auth.uid()
      or c.teacher_id = auth.uid()
    )
  )
);


-- Upload files only to own conversation

drop policy if exists "chat files insert" on storage.objects;

create policy "chat files insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and exists (
    select 1
    from conversations c
    where c.id::text = (storage.foldername(name))[1]
    and (
      c.student_id = auth.uid()
      or c.teacher_id = auth.uid()
    )
  )
);


-- Delete own uploaded files

drop policy if exists "chat files delete" on storage.objects;

create policy "chat files delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and owner_id = auth.uid()::text
);

