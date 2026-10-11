-- Preserve coupon redemption history.
-- A coupon with any redemption history must not be physically deleted.

alter table public.coupon_redemptions
drop constraint if exists coupon_redemptions_coupon_id_fkey;

alter table public.coupon_redemptions
add constraint coupon_redemptions_coupon_id_fkey
foreign key (coupon_id)
references public.course_coupons(id)
on delete restrict;
