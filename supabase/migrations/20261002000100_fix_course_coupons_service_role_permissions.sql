-- Fix service_role access for server-side coupon redemption.
-- RLS is still enabled; service_role bypasses RLS.

grant select, insert, update, delete
on table public.course_coupons
to service_role;
