create table if not exists public.course_coupons (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  is_active boolean not null default true,

  is_used boolean not null default false,

  used_by uuid
    references public.profiles(id)
    on delete set null,

  used_at timestamptz,

  created_at timestamptz not null default now()
);


create index if not exists course_coupons_code_idx
on public.course_coupons(code);


create index if not exists course_coupons_course_id_idx
on public.course_coupons(course_id);


alter table public.course_coupons enable row level security;


create policy "Admins can manage course coupons"
on public.course_coupons
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);


create policy "Users can check active coupons"
on public.course_coupons
for select
using (
  is_active = true
);
