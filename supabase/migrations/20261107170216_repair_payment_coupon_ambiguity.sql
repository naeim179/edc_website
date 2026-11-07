-- Qualify the expired-reservation predicate: coupon_id is also an OUT
-- parameter in these functions. Preserve all existing payment protections.
-- No existing order, reservation, coupon or subscription is changed here.
do $$
declare
 signature text;
 definition text;
 old_predicate constant text := 'where coupon_id = v_coupon.id';
begin
 foreach signature in array array[
  'public.reserve_discount_coupon_for_order(text,uuid,uuid,uuid,numeric,integer)',
  'public.redeem_free_course_coupon(text,uuid,uuid,uuid)'
 ] loop
  definition := replace(pg_get_functiondef(signature::regprocedure), chr(13), '');
  if length(definition)-length(replace(definition,old_predicate,'')) <> length(old_predicate) then
   raise exception 'Unexpected coupon definition: %', signature;
  end if;
  definition := replace(definition, 'update public.coupon_redemptions', 'update public.coupon_redemptions as expired_redemptions');
  definition := replace(definition,old_predicate,'where expired_redemptions.coupon_id = v_coupon.id');
  execute definition;
 end loop;
end $$;
-- CREATE OR REPLACE retains the existing service-role-only grants.
