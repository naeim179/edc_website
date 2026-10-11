-- ============================================================
-- YOUR WAY ANNOUNCEMENTS
-- Admin announcements targeted to students or teachers
-- ============================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  message text not null,

  audience text not null
    check (
      audience in (
        'student',
        'teacher'
      )
    ),

  is_active boolean not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists announcements_audience_active_idx
on public.announcements (
  audience,
  is_active,
  created_at desc
);


alter table public.announcements
enable row level security;


grant select, insert, update, delete
on public.announcements
to authenticated;

grant all
on public.announcements
to service_role;


-- ------------------------------------------------------------
-- Admin permission helper
-- ------------------------------------------------------------

create or replace function public.can_manage_announcements()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and (
        p.is_super_admin = true
        or
        'manage_announcements' = any(p.permissions)
      )
  );
$$;

revoke all
on function public.can_manage_announcements()
from public, anon;

grant execute
on function public.can_manage_announcements()
to authenticated, service_role;


-- ------------------------------------------------------------
-- Students / teachers can only see ACTIVE announcements
-- addressed to their own role.
-- ------------------------------------------------------------

drop policy if exists
  "Users view announcements for their role"
on public.announcements;

create policy
  "Users view announcements for their role"
on public.announcements
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = announcements.audience
  )
);


-- ------------------------------------------------------------
-- Authorized admins manage announcements
-- ------------------------------------------------------------

drop policy if exists
  "Announcement admins insert"
on public.announcements;

create policy
  "Announcement admins insert"
on public.announcements
for insert
to authenticated
with check (
  public.can_manage_announcements()
);


drop policy if exists
  "Announcement admins update"
on public.announcements;

create policy
  "Announcement admins update"
on public.announcements
for update
to authenticated
using (
  public.can_manage_announcements()
)
with check (
  public.can_manage_announcements()
);


drop policy if exists
  "Announcement admins delete"
on public.announcements;

create policy
  "Announcement admins delete"
on public.announcements
for delete
to authenticated
using (
  public.can_manage_announcements()
);
