-- Upgrade course offers system

alter table public.course_offers
add column if not exists discount_type text;

alter table public.course_offers
add column if not exists discount_value numeric(10,2) default 0;

alter table public.course_offers
add column if not exists final_price numeric(10,2);


create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  image_url text,
  bio text,
  experience_years integer default 0,
  specialization text,

  created_at timestamptz not null default now(),

  unique(user_id)
);


alter table public.course_instructors
add column if not exists offer_id uuid
references public.course_offers(id)
on delete cascade;


alter table public.course_instructors
drop constraint if exists course_instructors_course_id_teacher_id_key;


alter table public.course_instructors
add constraint course_instructors_unique_offer_teacher
unique(offer_id, teacher_id);


alter table public.teacher_profiles
enable row level security;


grant select, insert, update, delete
on public.teacher_profiles
to authenticated;


create policy "Users manage own teacher profile"
on public.teacher_profiles
for all
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


create policy "Everyone can view teacher profiles"
on public.teacher_profiles
for select
to anon, authenticated
using (
  true
);


update public.course_offers
set final_price = price
where final_price is null;
