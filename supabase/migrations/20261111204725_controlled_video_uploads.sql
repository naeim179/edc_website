-- Only uploads prepared after this migration are eligible for cleanup.
-- Retain provenance when a course/user is deleted; never infer legacy ownership.
create table public.lesson_video_uploads (
 id uuid primary key default gen_random_uuid(),
 course_id uuid references public.courses(id) on delete set null,
 created_by uuid references public.profiles(id) on delete set null,
 provider text not null check(provider in ('bunny','mux')),
 expected_bytes bigint not null check(expected_bytes between 1 and 94371840),
 mime_type text not null check(mime_type ~ '^video/[a-zA-Z0-9.+_-]{1,80}$'),
 state text not null default 'reserved' check(state in ('reserved','uploading','processing','ready','failed','cancelled','deleting','deleted')),
 provider_upload_id text, provider_asset_id text, provider_playback_id text, library_id text, upload_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '1 hour'), error_code text,
 unique(provider,provider_upload_id)
);
alter table public.lesson_video_uploads enable row level security;
revoke all on public.lesson_video_uploads from public,anon,authenticated;
grant select,insert,update,delete on public.lesson_video_uploads to service_role;
create index lesson_video_uploads_course_idx on public.lesson_video_uploads(course_id,state);
create index lesson_video_uploads_creator_idx on public.lesson_video_uploads(created_by,created_at desc);
create index lesson_video_uploads_cleanup_idx on public.lesson_video_uploads(state,created_at);
create index lesson_video_uploads_asset_idx on public.lesson_video_uploads(provider,provider_asset_id);
create index lessons_bunny_reference_idx on public.lessons(bunny_library_id,bunny_video_id) where bunny_video_id is not null;
create index lessons_mux_asset_reference_idx on public.lessons(mux_asset_id) where mux_asset_id is not null;
create index lessons_mux_playback_reference_idx on public.lessons(mux_playback_id) where mux_playback_id is not null;

create function public.reserve_lesson_video_upload(p_course_id uuid,p_provider text,p_bytes bigint,p_mime text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
 if v_user is null or not exists(select 1 from public.profiles p where p.id=v_user and (
  (p.role='admin' and (p.is_super_admin or 'manage_courses'=any(p.permissions))) or
  (p.role='teacher' and exists(select 1 from public.course_instructors ci where ci.course_id=p_course_id and ci.teacher_id=v_user)))) then
  raise insufficient_privilege using message='Course management permission required';
 end if;
 if not exists(select 1 from public.courses where id=p_course_id) then raise exception 'Course not found'; end if;
 if p_provider is null or p_provider not in ('bunny','mux') or p_bytes is null or p_bytes<1 or p_bytes>94371840
  or p_mime is null or p_mime !~ '^video/[a-zA-Z0-9.+_-]{1,80}$' then raise exception 'INVALID_UPLOAD_METADATA'; end if;
 perform pg_advisory_xact_lock(hashtextextended('video-user:'||v_user::text,0));
 perform pg_advisory_xact_lock(hashtextextended('video-course:'||p_course_id::text,0));
 if (select count(*) from public.lesson_video_uploads where created_by=v_user and created_at>now()-interval '24 hours')>=10 then
  raise exception 'UPLOAD_DAILY_LIMIT'; end if;
 if (select count(*) from public.lesson_video_uploads where created_by=v_user and state in ('reserved','uploading','processing') and expires_at>now())>=2
  or (select count(*) from public.lesson_video_uploads where course_id=p_course_id and state in ('reserved','uploading','processing') and expires_at>now())>=2 then raise exception 'UPLOAD_ACTIVE_LIMIT'; end if;
 if (select coalesce(sum(expected_bytes),0) from public.lesson_video_uploads where course_id=p_course_id and state<>'deleted')+p_bytes>2147483648 then
  raise exception 'UPLOAD_COURSE_LIMIT'; end if;
 insert into public.lesson_video_uploads(course_id,created_by,provider,expected_bytes,mime_type)
 values(p_course_id,v_user,p_provider,p_bytes,p_mime) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.reserve_lesson_video_upload(uuid,text,bigint,text) from public,anon;
grant execute on function public.reserve_lesson_video_upload(uuid,text,bigint,text) to authenticated;

-- Service-only lifecycle operations are reached through fresh app authorization.
create function public.claim_lesson_video_upload(p_id uuid,p_course_id uuid) returns public.lesson_video_uploads
language plpgsql security definer set search_path='' as $$
declare r public.lesson_video_uploads;
begin
 select * into r from public.lesson_video_uploads where id=p_id and course_id=p_course_id for update;
 if not found or r.state<>'reserved' or r.expires_at<=now() or r.provider_upload_id is null then
  raise exception 'UPLOAD_NOT_AVAILABLE'; end if;
 update public.lesson_video_uploads set state='uploading',updated_at=now(),expires_at=now()+interval '15 minutes' where id=r.id returning * into r;
 return r;
end $$;

create function public.video_upload_is_linked(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lesson_video_uploads u join public.lessons l on
  (u.provider='bunny' and l.bunny_video_id=u.provider_asset_id and l.bunny_library_id=u.library_id) or
  (u.provider='mux' and (l.mux_asset_id=u.provider_asset_id or (u.provider_playback_id is not null and l.mux_playback_id=u.provider_playback_id))) where u.id=p_id);
$$;

create function public.list_stale_video_uploads() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
  select id,course_id,provider,expected_bytes,state,created_at,error_code from public.lesson_video_uploads u
  where state<>'deleted' and created_at<now()-interval '24 hours' and expires_at<now()
   and not public.video_upload_is_linked(u.id)
  order by created_at,id limit 50
 ) r;
$$;

create function public.cancel_lesson_video_upload(p_id uuid,p_course_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.lesson_video_uploads;
begin
 select * into r from public.lesson_video_uploads where id=p_id and course_id=p_course_id for update;
 if not found then raise exception 'UPLOAD_NOT_FOUND'; end if;
 if public.video_upload_is_linked(r.id) then raise exception 'UPLOAD_ALREADY_LINKED'; end if;
 if r.state in ('deleting','deleted') then raise exception 'UPLOAD_NOT_AVAILABLE'; end if;
 update public.lesson_video_uploads set state='cancelled',updated_at=now() where id=r.id;
 return true;
end $$;

create function public.claim_stale_video_upload(p_id uuid) returns public.lesson_video_uploads
language plpgsql security definer set search_path='' as $$
declare r public.lesson_video_uploads;
begin
 perform pg_advisory_xact_lock(hashtextextended('video-lesson-link',0));
 select * into r from public.lesson_video_uploads where id=p_id for update;
 if not found or r.state='deleted' or r.created_at>now()-interval '24 hours' or r.expires_at>now() then
  raise exception 'UPLOAD_NOT_STALE'; end if;
 if public.video_upload_is_linked(r.id) then raise exception 'UPLOAD_ALREADY_LINKED'; end if;
 -- The row lock also serializes against the lesson trigger below.
 update public.lesson_video_uploads set state='deleting',updated_at=now() where id=r.id returning * into r;
 return r;
end $$;

create function public.guard_tracked_lesson_video() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.lesson_video_uploads; v_course uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('video-lesson-link',0));
 select course_id into v_course from public.sections where id=new.section_id;
 for r in select * from public.lesson_video_uploads u where
  (new.video_provider='bunny' and u.provider='bunny' and u.provider_asset_id=new.bunny_video_id and u.library_id=new.bunny_library_id) or
  (new.video_provider='mux' and u.provider='mux' and (u.provider_asset_id=new.mux_asset_id or
   (u.provider_playback_id is not null and u.provider_playback_id=new.mux_playback_id))) order by u.id for update loop
  if r.state<>'ready' or r.course_id is distinct from v_course or
   (new.video_provider='mux' and (new.mux_asset_id is distinct from r.provider_asset_id or new.mux_playback_id is distinct from r.provider_playback_id))
   then raise exception 'VIDEO_NOT_READY_OR_WRONG_COURSE'; end if;
 end loop;
 return new;
end $$;
create trigger guard_tracked_lesson_video before insert or update of section_id,video_provider,bunny_video_id,bunny_library_id,mux_asset_id,mux_playback_id on public.lessons
 for each row execute function public.guard_tracked_lesson_video();

revoke all on function public.claim_lesson_video_upload(uuid,uuid),public.cancel_lesson_video_upload(uuid,uuid),public.video_upload_is_linked(uuid),public.list_stale_video_uploads(),public.claim_stale_video_upload(uuid),public.guard_tracked_lesson_video() from public,anon,authenticated;
grant execute on function public.claim_lesson_video_upload(uuid,uuid),public.cancel_lesson_video_upload(uuid,uuid),public.video_upload_is_linked(uuid),public.list_stale_video_uploads(),public.claim_stale_video_upload(uuid) to service_role;
