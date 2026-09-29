-- Clean message update policies

drop policy if exists "messages_update_read" on messages;
drop policy if exists "messages_update" on messages;
drop policy if exists "messages_update_delete" on messages;


-- Edit own messages + soft delete own messages
create policy "messages_update_own"
on messages
for update
to authenticated
using (
  sender_id = auth.uid()
)
with check (
  sender_id = auth.uid()
);


-- Mark messages as read (only other person's messages)
create policy "messages_update_read"
on messages
for update
to authenticated
using (
  exists (
    select 1
    from conversations c
    where c.id = messages.conversation_id
    and (
      c.student_id = auth.uid()
      or c.teacher_id = auth.uid()
    )
  )
)
with check (
  sender_id <> auth.uid()
);
