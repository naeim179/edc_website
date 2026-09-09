-- Admin-only section management through secure RPC functions.
-- Normal authenticated users keep read access only.

revoke insert, update, delete
on table public.sections
from authenticated;


create or replace function public.admin_create_section(
  p_course_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_index integer;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Section title is required';
  end if;

  select coalesce(max(s.order_index), 0) + 1
  into v_order_index
  from public.sections s
  where s.course_id = p_course_id;

  insert into public.sections (
    course_id,
    title,
    order_index
  )
  values (
    p_course_id,
    trim(p_title),
    v_order_index
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'title', trim(p_title),
    'order_index', v_order_index
  );
end;
$$;


create or replace function public.admin_update_section(
  p_section_id uuid,
  p_course_id uuid,
  p_title text,
  p_order_index integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Section title is required';
  end if;

  if p_order_index < 1 then
    raise exception 'Section order must be 1 or greater';
  end if;

  update public.sections
  set
    title = trim(p_title),
    order_index = p_order_index
  where id = p_section_id
    and course_id = p_course_id;
end;
$$;


create or replace function public.admin_delete_section(
  p_section_id uuid,
  p_course_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  delete from public.sections
  where id = p_section_id
    and course_id = p_course_id;
end;
$$;


revoke all
on function public.admin_create_section(uuid, text)
from public;

revoke all
on function public.admin_update_section(uuid, uuid, text, integer)
from public;

revoke all
on function public.admin_delete_section(uuid, uuid)
from public;


grant execute
on function public.admin_create_section(uuid, text)
to authenticated;

grant execute
on function public.admin_update_section(uuid, uuid, text, integer)
to authenticated;

grant execute
on function public.admin_delete_section(uuid, uuid)
to authenticated;
