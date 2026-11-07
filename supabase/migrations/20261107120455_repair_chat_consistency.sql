-- Keep summaries/read counts consistent for inserts, edits and both kinds of deletion.
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.refresh_chat_conversation(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_last public.messages%rowtype;
begin
  perform 1 from public.conversations where id=p_id for update;
  if not found then return; end if;
  select * into v_last from public.messages where conversation_id=p_id
    order by created_at desc,id desc limit 1;
  update public.conversations c set
    last_message_at=v_last.created_at,
    last_message_preview=case when v_last.id is null then null
      when v_last.deleted_at is not null then '__deleted__'
      when btrim(v_last.content)<>'' then left(v_last.content,200)
      when v_last.message_type='image' then '__image__' else '__file__' end,
    student_unread_count=(select count(*) from public.messages m where m.conversation_id=p_id
      and m.sender_id=c.teacher_id and m.read_at is null and m.deleted_at is null),
    teacher_unread_count=(select count(*) from public.messages m where m.conversation_id=p_id
      and m.sender_id=c.student_id and m.read_at is null and m.deleted_at is null)
  where c.id=p_id;
end $$;
revoke all on function private.refresh_chat_conversation(uuid) from public,anon,authenticated;

create or replace function private.sync_chat_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_chat_conversation(case when tg_op='DELETE' then old.conversation_id else new.conversation_id end);
  return null;
end $$;
revoke all on function private.sync_chat_conversation() from public,anon,authenticated;
drop trigger if exists on_message_insert on public.messages;
create trigger sync_chat_conversation after insert or update or delete on public.messages
for each row execute function private.sync_chat_conversation();

-- Existing message rows and storage objects are intentionally left untouched.
-- Attachment metadata is cleared only for a future, explicitly requested soft deletion.

create or replace function private.guard_chat_message()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='INSERT' then
    new.read_at=null; new.edited_at=null; new.deleted_at=null; new.created_at=clock_timestamp();
  else
    if (new.id,new.conversation_id,new.sender_id,new.created_at,new.message_type)
      is distinct from (old.id,old.conversation_id,old.sender_id,old.created_at,old.message_type) then
      raise exception 'MESSAGE_IDENTITY_IMMUTABLE' using errcode='42501';
    end if;
    if old.deleted_at is not null and
      (new.content,new.edited_at,new.deleted_at,new.attachment_url,new.attachment_name,new.attachment_size)
      is distinct from (old.content,old.edited_at,old.deleted_at,old.attachment_url,old.attachment_name,old.attachment_size) then
      raise exception 'MESSAGE_ALREADY_DELETED' using errcode='42501';
    end if;
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_at=clock_timestamp(); new.content='';
      new.attachment_url=null; new.attachment_name=null; new.attachment_size=null;
    elsif new.content is distinct from old.content then new.edited_at=clock_timestamp(); end if;
  end if;
  if new.deleted_at is null and btrim(new.content)='' and new.attachment_url is null then
    raise exception 'EMPTY_MESSAGE' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.guard_chat_message() from public,anon,authenticated;
create trigger guard_chat_message before insert or update on public.messages
for each row execute function private.guard_chat_message();

-- Direct clients may edit only their body or soft-delete marker. Receipts use the guarded RPC.
revoke update on public.messages from authenticated;
grant update(content,edited_at,deleted_at) on public.messages to authenticated;
revoke truncate,references,trigger on public.messages,public.conversations,public.user_presence from anon,authenticated;

create index if not exists idx_messages_unread_chat on public.messages(conversation_id,sender_id)
where read_at is null and deleted_at is null;

do $$ declare v_id uuid; begin
  for v_id in select id from public.conversations loop
    perform private.refresh_chat_conversation(v_id);
  end loop;
end $$;

-- Concurrent clicks must reuse the same student/course/teacher conversation.
create or replace function public.start_conversation(p_course_id uuid,p_teacher_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid:=auth.uid();
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='student') then
    raise exception 'STUDENT_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.enrollments where student_id=v_uid and course_id=p_course_id) then
    raise exception 'ENROLLMENT_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.course_instructors where teacher_id=p_teacher_id and course_id=p_course_id) then
    raise exception 'COURSE_TEACHER_REQUIRED' using errcode='42501'; end if;
  insert into public.conversations(student_id,teacher_id,course_id) values(v_uid,p_teacher_id,p_course_id)
  on conflict(student_id,teacher_id,course_id) do update set course_id=excluded.course_id returning id into v_id;
  return v_id;
end $$;
revoke all on function public.start_conversation(uuid,uuid) from public,anon;
grant execute on function public.start_conversation(uuid,uuid) to authenticated;

-- Admins already have read-only message access; attachments should follow the same rule.
drop policy if exists "chat files select" on storage.objects;
create policy "chat files select" on storage.objects for select to authenticated using (
  bucket_id='chat-files' and exists(select 1 from public.conversations c
    where c.id::text=(storage.foldername(name))[1] and
    (c.student_id=(select auth.uid()) or c.teacher_id=(select auth.uid()) or
      exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')))
);
update storage.buckets set file_size_limit=10485760 where id='chat-files';
