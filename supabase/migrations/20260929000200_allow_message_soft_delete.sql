-- Allow sender to soft delete his own messages

drop policy if exists "messages_update_delete" on messages;

create policy "messages_update_delete" on messages
for update
using (
  sender_id = auth.uid()
  or exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  sender_id = auth.uid()
  or exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);
