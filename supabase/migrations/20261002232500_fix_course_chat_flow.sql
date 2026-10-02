-- ============================================================
-- Course chat cleanup + participant visibility
-- ============================================================

-- Participants may see the basic profile of the person
-- they are chatting with.
create or replace function public.can_view_chat_profile(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_profile_id = auth.uid()
    or exists (
      select 1
      from public.conversations c
      where
        (
          c.student_id = auth.uid()
          and c.teacher_id = p_profile_id
        )
        or
        (
          c.teacher_id = auth.uid()
          and c.student_id = p_profile_id
        )
    );
$$;

revoke all
on function public.can_view_chat_profile(uuid)
from public, anon;

grant execute
on function public.can_view_chat_profile(uuid)
to authenticated, service_role;


drop policy if exists
  "Chat participants can view each other profiles"
on public.profiles;

create policy
  "Chat participants can view each other profiles"
on public.profiles
for select
to authenticated
using (
  public.can_view_chat_profile(id)
);


grant select (
  id,
  full_name,
  avatar_url
)
on public.profiles
to authenticated;


-- Backfill existing teacher images into profiles.avatar_url.
-- Future teacher profile saves already keep these in sync.
update public.profiles p
set avatar_url = tp.image_url
from public.teacher_profiles tp
where
  p.id = tp.user_id
  and p.role = 'teacher'
  and tp.image_url is not null
  and p.avatar_url is distinct from tp.image_url;


-- Remove conversations that no longer represent the
-- CURRENT teacher-course relationship.
delete from public.conversations c
where not exists (
  select 1
  from public.course_instructors ci
  where
    ci.course_id = c.course_id
    and ci.teacher_id = c.teacher_id
);


-- Remove conversations for students no longer enrolled.
delete from public.conversations c
where not exists (
  select 1
  from public.enrollments e
  where
    e.course_id = c.course_id
    and e.student_id = c.student_id
);


-- Current environment is still test data:
-- remove auto-created conversations that never had a message.
delete from public.conversations c
where not exists (
  select 1
  from public.messages m
  where m.conversation_id = c.id
);


-- If a teacher is removed from a course in the future,
-- that teacher must lose the course conversations too.
create or replace function
public.cleanup_course_teacher_conversations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.conversations
  where
    course_id = old.course_id
    and teacher_id = old.teacher_id;

  return old;
end;
$$;

drop trigger if exists
  trg_cleanup_course_teacher_conversations
on public.course_instructors;

create trigger
  trg_cleanup_course_teacher_conversations
after delete
on public.course_instructors
for each row
execute function
  public.cleanup_course_teacher_conversations();
