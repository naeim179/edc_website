-- Only conversation members (or read-only admins) may observe private chat events.
-- Realtime owns this table; its RLS is already enabled. Only policies are managed here.
create policy chat_channel_read on realtime.messages for select to authenticated using (
  exists(select 1 from public.conversations c
    where 'messages-'||c.id::text=(select realtime.topic())
    and (c.student_id=(select auth.uid()) or c.teacher_id=(select auth.uid()) or
      exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')))
);
create policy chat_channel_typing on realtime.messages for insert to authenticated with check (
  exists(select 1 from public.conversations c
    where 'messages-'||c.id::text=(select realtime.topic())
    and (c.student_id=(select auth.uid()) or c.teacher_id=(select auth.uid())))
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('student','teacher'))
);
