-- ============================================
-- Chat V2 Upgrade
-- Attachments + Edit/Delete + Presence
-- ============================================


-- ==========================
-- Extend messages
-- ==========================

alter table messages
add column if not exists edited_at timestamptz,
add column if not exists deleted_at timestamptz,
add column if not exists message_type text not null default 'text',
add column if not exists attachment_url text,
add column if not exists attachment_name text,
add column if not exists attachment_size bigint;


-- ==========================
-- Validate message types
-- ==========================

alter table messages
drop constraint if exists messages_type_check;

alter table messages
add constraint messages_type_check
check (
  message_type in ('text','image','file')
);


-- ==========================
-- Presence
-- ==========================

create table if not exists user_presence (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);


alter table user_presence enable row level security;


drop policy if exists "presence_select" on user_presence;

create policy "presence_select"
on user_presence
for select
to authenticated
using (true);


drop policy if exists "presence_insert_update" on user_presence;

create policy "presence_insert_update"
on user_presence
for all
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


-- ==========================
-- Messages update permissions
-- ==========================

drop policy if exists "messages_update_read" on messages;


create policy "messages_update"
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
  sender_id = auth.uid()
);


-- ==========================
-- Realtime presence
-- ==========================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
    and tablename='user_presence'
  ) then
    alter publication supabase_realtime add table user_presence;
  end if;
end $$;


