alter table public.orders
add column if not exists offer_id uuid
references public.course_offers(id)
on delete set null;


create index if not exists orders_offer_id_idx
on public.orders(offer_id);
