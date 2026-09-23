-- ============================================================
-- CHAT SYSTEM
-- Student <-> Teacher conversations, scoped to a course.
-- Admin has read-only visibility over everything.
-- ============================================================

-- ------------------------------------------------------------
-- 1. conversations
--
-- One conversation = one (course, student, teacher) triple.
-- Prevents duplicate threads if the student re-opens "Contact
-- Teacher" for the same course multiple times.
-- ------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  teacher_id uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (course_id, student_id, teacher_id)
);

create index if not exists conversations_student_idx
on public.conversations(student_id);

create index if not exists conversations_teacher_idx
on public.conversations(teacher_id);

create index if not exists conversations_course_idx
on public.conversations(course_id);

-- Fast "sort my inbox by latest activity" query.
create index if not exists conversations_updated_at_idx
on public.conversations(updated_at desc);


-- ------------------------------------------------------------
-- 2. messages
-- ------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  sender_id uuid not null
    references auth.users(id)
    on delete cascade,

  message text not null
    check (char_length(trim(message)) > 0),

  is_read boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
on public.messages(conversation_id, created_at);

create index if not exists messages_sender_idx
on public.messages(sender_id);

-- Partial index: fast unread-count queries per conversation.
create index if not exists messages_unread_idx
on public.messages(conversation_id)
where is_read = false;


-- ------------------------------------------------------------
-- 3. Touch conversations.updated_at on every new message
-- so the inbox can be sorted by last activity without a join.
-- ------------------------------------------------------------

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message
on public.messages;

create trigger trg_touch_conversation_on_message
after insert on public.messages
for each row
execute function public.touch_conversation_on_message();


-- ------------------------------------------------------------
-- 4. Helper: is the current user a participant in this
-- conversation (student or teacher side)?
--
-- NOTE: assumes public.is_admin() already exists in this
-- project (used by subscriptions/orders policies).
-- ------------------------------------------------------------

create or replace function public.is_conversation_participant(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  );
$$;

-- Helper: is this user an instructor assigned to this course?
-- Reuses the same relation as course_instructors elsewhere.
create or replace function public.is_course_instructor(
  p_course_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_instructors ci
    where ci.course_id = p_course_id
      and ci.teacher_id = p_teacher_id
  );
$$;


-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;


-- conversations: select ---------------------------------------

drop policy if exists "Participants and admin can view conversations"
on public.conversations;

create policy "Participants and admin can view conversations"
on public.conversations
for select
to authenticated
using (
  auth.uid() = student_id
  or auth.uid() = teacher_id
  or public.is_admin()
);


-- conversations: insert -----------------------------------------
-- Either side can open the conversation (student contacting the
-- teacher, or teacher reaching out to a student), but only
-- between a real (course, student, teacher) relationship:
--   - teacher_id must actually be an instructor of course_id
--   - student_id must actually be enrolled in course_id
-- and the caller must be one of the two parties (never a third
-- party impersonating student/teacher).

drop policy if exists "Students can start a conversation with their course teacher"
on public.conversations;

drop policy if exists "Participants can start a conversation"
on public.conversations;

create policy "Participants can start a conversation"
on public.conversations
for insert
to authenticated
with check (
  (auth.uid() = student_id or auth.uid() = teacher_id)
  and public.is_course_instructor(course_id, teacher_id)
  and exists (
    select 1
    from public.enrollments e
    where e.student_id = student_id
      and e.course_id = course_id
  )
);


-- No update / delete policy on conversations for anyone except
-- service_role (row metadata only changes via the trigger above).


-- messages: select ------------------------------------------------

drop policy if exists "Participants and admin can view messages"
on public.messages;

create policy "Participants and admin can view messages"
on public.messages
for select
to authenticated
using (
  public.is_conversation_participant(conversation_id)
  or public.is_admin()
);


-- messages: insert --------------------------------------------------
-- Only a participant (student or teacher) can send, and only
-- as themselves. Admin is explicitly excluded (view-only).

drop policy if exists "Participants can send messages"
on public.messages;

create policy "Participants can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_conversation_participant(conversation_id)
);


-- messages: update (is_read only) ------------------------------------
-- Only the OTHER participant (the recipient) can mark a message
-- read - the sender can't mark their own message as read.
-- Column-level grant below stops any column but is_read from
-- being touched, even though the policy alone can't enforce that.

drop policy if exists "Recipient can mark messages as read"
on public.messages;

create policy "Recipient can mark messages as read"
on public.messages
for update
to authenticated
using (
  auth.uid() <> sender_id
  and public.is_conversation_participant(conversation_id)
)
with check (
  auth.uid() <> sender_id
  and public.is_conversation_participant(conversation_id)
);


-- ------------------------------------------------------------
-- 6. Grants
-- ------------------------------------------------------------

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

-- Only is_read may be updated by end users; message text/sender
-- are immutable once written.
grant update (is_read) on public.messages to authenticated;

grant all on public.conversations to service_role;
grant all on public.messages to service_role;


-- ------------------------------------------------------------
-- 7. Realtime (optional)
-- Uncomment if the project uses Supabase Realtime for live
-- message delivery in the chat UI.
-- ------------------------------------------------------------

-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.conversations;
