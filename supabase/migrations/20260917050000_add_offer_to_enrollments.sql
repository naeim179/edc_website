alter table public.enrollments
add column if not exists offer_id uuid
references public.course_offers(id)
on delete set null;


create index if not exists enrollments_offer_id_idx
on public.enrollments(offer_id);
