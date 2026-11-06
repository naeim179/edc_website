-- Your Way: enforce admin read-only access to messages.
-- Additive migration. Does not modify existing message rows.
-- Restrictive policies apply alongside existing permissive policies.
-- Service-role operations and SECURITY DEFINER functions require
-- separate auditing because they can bypass RLS.

-- Remove the previous policy granting admins hard-delete access.
drop policy if exists "messages_delete" on public.messages;

-- Keep hard-delete permission limited to the original sender,
-- provided the sender is a student or teacher.
create policy "messages_delete"
on public.messages
for delete
to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('student', 'teacher')
  )
);

-- Even if another permissive INSERT policy exists, administrators
-- must never insert messages through the authenticated role.
create policy "messages_write_role_insert_guard"
on public.messages
as restrictive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('student', 'teacher')
  )
);

-- Restrict updates regardless of other permissive UPDATE policies.
create policy "messages_write_role_update_guard"
on public.messages
as restrictive
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('student', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('student', 'teacher')
  )
);

-- Restrict deletions even if other permissive DELETE policies exist.
create policy "messages_write_role_delete_guard"
on public.messages
as restrictive
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('student', 'teacher')
  )
);

-- YOUR_WAY_CHAT_READ_RECEIPT_HARDENING
--
-- Remove the broad permissive UPDATE policy.
-- RLS policies cannot restrict updates to individual columns.
-- The existing messages_update_own policy remains for senders.

drop policy if exists "messages_update_read" on public.messages;

-- Read receipts must go through a guarded SECURITY DEFINER RPC.

create or replace function public.mark_conversation_read(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Validate membership and role BEFORE modifying any messages.
  if v_uid is null or not exists (
    select 1
    from public.conversations c
    join public.profiles p
      on p.id = v_uid
    where c.id = p_conversation_id
      and (
        c.student_id = v_uid
        or c.teacher_id = v_uid
      )
      and p.role in ('student', 'teacher')
  ) then
    raise exception 'NOT_CONVERSATION_PARTICIPANT'
      using errcode = '42501';
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = p_conversation_id
    and m.sender_id <> v_uid
    and m.read_at is null;

  update public.conversations c
  set
    student_unread_count =
      case
        when c.student_id = v_uid then 0
        else c.student_unread_count
      end,
    teacher_unread_count =
      case
        when c.teacher_id = v_uid then 0
        else c.teacher_unread_count
      end
  where c.id = p_conversation_id;
end;
$$;

revoke all on function public.mark_conversation_read(uuid)
from public, anon;

grant execute on function public.mark_conversation_read(uuid)
to authenticated;
