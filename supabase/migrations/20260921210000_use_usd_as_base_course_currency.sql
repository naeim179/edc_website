-- USD is now the base/default course currency.
-- Existing numeric course prices are preserved as-is.

alter table public.courses
alter column currency set default 'USD';

update public.courses
set currency = 'USD';
