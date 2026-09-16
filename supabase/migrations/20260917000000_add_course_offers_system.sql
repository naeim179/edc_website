-- ============================================================
-- Course Offers System
-- Supports Group and Private versions of the same course
-- ============================================================


-- ------------------------------------------------------------
-- 1. Course offer type
-- ------------------------------------------------------------

create type public.course_offer_type
as enum (
  'group',
  'private'
);


-- ------------------------------------------------------------
-- 2. Course Offers
-- ------------------------------------------------------------

create table public.course_offers (

  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  type public.course_offer_type not null,

  price numeric(10,2) not null default 0,

  max_students integer,

  created_at timestamptz not null default now(),

  unique(course_id, type)
);



-- ------------------------------------------------------------
-- 3. Link sections to offer
-- ------------------------------------------------------------

alter table public.sections
add column if not exists offer_id uuid
references public.course_offers(id)
on delete cascade;



-- ------------------------------------------------------------
-- 4. Enable RLS
-- ------------------------------------------------------------

alter table public.course_offers enable row level security;



-- ------------------------------------------------------------
-- 5. Grants
-- ------------------------------------------------------------

grant select, insert, update, delete
on public.course_offers
to authenticated;



-- ------------------------------------------------------------
-- 6. Admin management
-- ------------------------------------------------------------

create policy "Admins manage course offers"
on public.course_offers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());



-- ------------------------------------------------------------
-- 7. Teachers can view offers of their courses
-- ------------------------------------------------------------

create policy "Teachers view course offers"
on public.course_offers
for select
to authenticated
using (
  exists (
    select 1
    from public.course_instructors ci
    where ci.course_id = course_offers.course_id
    and ci.teacher_id = auth.uid()
  )
);


