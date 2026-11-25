-- Direct messages belong to the student/teacher pair. Course enrollment and
-- instructor assignment still authorize opening a conversation from a course.
lock table public.course_instructors, public.messages, public.conversations in access exclusive mode;

create table public.chat_conversation_aliases (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade
);
create index chat_conversation_aliases_conversation_idx
  on public.chat_conversation_aliases(conversation_id);
alter table public.chat_conversation_aliases enable row level security;
revoke all on public.chat_conversation_aliases from public, anon, authenticated;
grant select on public.chat_conversation_aliases to authenticated;
create policy "Chat participants and moderators resolve old conversation IDs"
on public.chat_conversation_aliases for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id));

insert into public.chat_conversation_aliases(id, conversation_id)
select id, canonical_id
from (
  select id, first_value(id) over (
    partition by student_id, teacher_id order by created_at, id
  ) as canonical_id
  from public.conversations
) ranked
where id <> canonical_id;

-- Keep the original storage object names. Only this migration sets the
-- attachment folder override, and clients cannot write that column.
alter table public.messages add column attachment_conversation_id uuid;
revoke insert on public.messages from authenticated;
grant insert (id, conversation_id, sender_id, content, message_type,
  attachment_url, attachment_name, attachment_size)
on public.messages to authenticated;

alter table public.messages disable trigger guard_chat_message;
alter table public.messages disable trigger sync_chat_conversation;
update public.messages m
set conversation_id = a.conversation_id,
    attachment_conversation_id = case when m.attachment_url is not null then a.id end
from public.chat_conversation_aliases a
where m.conversation_id = a.id;
alter table public.messages enable trigger sync_chat_conversation;
alter table public.messages enable trigger guard_chat_message;

delete from public.conversations c
using public.chat_conversation_aliases a
where c.id = a.id;

do $$
declare v_id uuid;
begin
  for v_id in select distinct conversation_id from public.chat_conversation_aliases loop
    perform private.refresh_chat_conversation(v_id);
  end loop;
end $$;

drop trigger trg_cleanup_course_teacher_conversations on public.course_instructors;
alter table public.conversations
  drop constraint conversations_student_id_teacher_id_course_id_key,
  add constraint conversations_student_teacher_key unique (student_id, teacher_id),
  drop constraint conversations_course_id_fkey,
  alter column course_id drop not null,
  add constraint conversations_course_id_fkey foreign key (course_id)
    references public.courses(id) on delete set null;

create or replace function public.start_conversation_for_student(
  p_student_id uuid, p_course_id uuid, p_teacher_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'STUDENT_REQUIRED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.enrollments where student_id = p_student_id and course_id = p_course_id) then
    raise exception 'ENROLLMENT_REQUIRED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.course_instructors i join public.profiles p on p.id = i.teacher_id
    where i.teacher_id = p_teacher_id and i.course_id = p_course_id and p.role = 'teacher'
  ) then
    raise exception 'COURSE_TEACHER_REQUIRED' using errcode = '42501';
  end if;

  insert into public.conversations(student_id, teacher_id)
  values (p_student_id, p_teacher_id)
  on conflict (student_id, teacher_id) do update set student_id = excluded.student_id
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.start_conversation_for_student(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_conversation_for_student(uuid, uuid, uuid) to service_role;

create or replace function public.start_conversation(p_course_id uuid, p_teacher_id uuid)
returns uuid language sql security definer set search_path = '' as $$
  select public.start_conversation_for_student(auth.uid(), p_course_id, p_teacher_id);
$$;
revoke all on function public.start_conversation(uuid, uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

drop policy "chat files select" on storage.objects;
create policy "chat files select" on storage.objects for select to authenticated
using (
  bucket_id = 'chat-files' and (
    exists (select 1 from public.conversations c where c.id::text = (storage.foldername(name))[1])
    or exists (select 1 from public.chat_conversation_aliases a where a.id::text = (storage.foldername(name))[1])
  )
);
