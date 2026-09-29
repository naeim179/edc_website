-- Allow users to delete their own messages

drop policy if exists "messages_delete" on messages;

create policy "messages_delete" on messages
for delete
using (
  sender_id = auth.uid()
  or exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);
