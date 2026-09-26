-- ============================================
-- Chat System: conversations + messages
-- ============================================

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  student_unread_count int not null default 0,
  teacher_unread_count int not null default 0,
  unique (student_id, teacher_id, course_id)
);

create index if not exists idx_conversations_student on conversations(student_id);
create index if not exists idx_conversations_teacher on conversations(teacher_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

-- ==================== conversations policies ====================

drop policy if exists "conversations_select" on conversations;
create policy "conversations_select" on conversations for select
using (
  auth.uid() = student_id
  or auth.uid() = teacher_id
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- لا يوجد insert مباشر مسموح - فقط عبر دالة start_conversation (security definer)
revoke insert on conversations from authenticated;
revoke update on conversations from authenticated;

-- ==================== messages policies ====================

drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  )
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- الإرسال: فقط طالب أو مدرس مشارك بالمحادثة - الأدمن ممنوع (view-only حقيقي على مستوى DB)
drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  )
);

-- تحديد كمقروء: يسمح فقط بتحديد رسائل الطرف الآخر كمقروءة
drop policy if exists "messages_update_read" on messages;
create policy "messages_update_read" on messages for update
using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  )
)
with check (
  sender_id <> auth.uid()
);

-- ==================== trigger: تحديث ملخص المحادثة + العداد ====================

create or replace function handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.content, 200),
    student_unread_count = case
      when new.sender_id = teacher_id then student_unread_count + 1
      else student_unread_count
    end,
    teacher_unread_count = case
      when new.sender_id = student_id then teacher_unread_count + 1
      else teacher_unread_count
    end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert on messages;
create trigger on_message_insert
after insert on messages
for each row execute function handle_new_message();

-- ==================== function: بدء محادثة (الطالب فقط) ====================

create or replace function start_conversation(p_course_id uuid, p_teacher_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_student_id uuid := auth.uid();
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if not exists (
    select 1 from enrollments
    where student_id = v_student_id and course_id = p_course_id
  ) then
    raise exception 'غير مسجل في هذه الدورة';
  end if;

  if not exists (
    select 1 from course_instructors
    where teacher_id = p_teacher_id and course_id = p_course_id
  ) then
    raise exception 'هذا المدرس غير مسؤول عن هذه الدورة';
  end if;

  select id into v_conversation_id
  from conversations
  where student_id = v_student_id
    and teacher_id = p_teacher_id
    and course_id = p_course_id;

  if v_conversation_id is null then
    insert into conversations (student_id, teacher_id, course_id)
    values (v_student_id, p_teacher_id, p_course_id)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function start_conversation(uuid, uuid) to authenticated;

-- ==================== function: تصفير العداد + تحديد كمقروء ====================

create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and read_at is null;

  update conversations
  set
    student_unread_count = case when student_id = v_uid then 0 else student_unread_count end,
    teacher_unread_count = case when teacher_id = v_uid then 0 else teacher_unread_count end
  where id = p_conversation_id
    and (student_id = v_uid or teacher_id = v_uid);
end;
$$;

grant execute on function mark_conversation_read(uuid) to authenticated;

-- ==================== realtime ====================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table conversations;
  end if;
end $$;
