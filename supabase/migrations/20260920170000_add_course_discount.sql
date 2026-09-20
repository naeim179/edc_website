alter table public.courses
add column if not exists discount_type text
  check (discount_type in ('percentage', 'fixed'));

alter table public.courses
add column if not exists discount_value numeric(10,2)
  not null default 0;

alter table public.courses
add constraint courses_discount_value_non_negative
check (discount_value >= 0);

alter table public.courses
add constraint courses_percentage_discount_limit
check (
  discount_type is null
  or discount_type <> 'percentage'
  or discount_value <= 100
);
