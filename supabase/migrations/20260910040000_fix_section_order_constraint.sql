-- Ensure sections always start from order 1

alter table public.sections
alter column order_index set default 1;


update public.sections
set order_index = 1
where order_index < 1;


alter table public.sections
drop constraint if exists sections_order_index_positive;


alter table public.sections
add constraint sections_order_index_positive
check (order_index >= 1);
