-- The platform now accepts USD only.
-- Keep currency columns for historical/payment auditing,
-- but all new records default to USD.

alter table public.courses
  alter column currency set default 'USD';

alter table public.orders
  alter column currency set default 'USD';

alter table public.subscriptions
  alter column currency set default 'USD';

update public.courses
set currency = 'USD'
where currency is distinct from 'USD';
