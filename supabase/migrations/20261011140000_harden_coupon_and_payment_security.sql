-- ============================================================
-- Coupon + payment hardening
-- ============================================================

-- Coupon codes are validated server-side now.
-- Normal authenticated users must not enumerate active coupons.
drop policy if exists "Users can check active coupons"
on public.course_coupons;

revoke select, insert, update, delete
on table public.course_coupons
from anon, authenticated;

grant select, insert, update, delete
on table public.course_coupons
to service_role;


-- Never revive a redemption that was already released.
create or replace function public.finalize_coupon_redemption_for_order(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_redemption public.coupon_redemptions%rowtype;
  v_coupon public.course_coupons%rowtype;
  v_active_reservations integer := 0;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if not found or v_order.coupon_id is null then
    return false;
  end if;

  select *
  into v_redemption
  from public.coupon_redemptions
  where order_id = p_order_id
    and coupon_id = v_order.coupon_id
    and status in ('reserved', 'redeemed')
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'COUPON_RESERVATION_NOT_ACTIVE';
  end if;

  if v_redemption.status = 'redeemed' then
    return true;
  end if;

  select *
  into v_coupon
  from public.course_coupons
  where id = v_redemption.coupon_id
  for update;

  if not found then
    raise exception 'COUPON_NOT_FOUND';
  end if;

  -- If the reservation timestamp passed but it has not yet been
  -- released, allow late fulfillment only if capacity still exists.
  if v_redemption.reservation_expires_at is not null
     and v_redemption.reservation_expires_at <= now() then

    select count(*)::integer
    into v_active_reservations
    from public.coupon_redemptions r
    where r.coupon_id = v_coupon.id
      and r.id <> v_redemption.id
      and r.status = 'reserved'
      and r.reservation_expires_at > now();

    if v_coupon.max_uses is not null
       and v_coupon.used_count + v_active_reservations >= v_coupon.max_uses then
      raise exception 'COUPON_RESERVATION_EXPIRED';
    end if;
  end if;

  update public.coupon_redemptions
  set
    status = 'redeemed',
    redeemed_at = now(),
    reservation_expires_at = null,
    updated_at = now()
  where id = v_redemption.id;

  update public.course_coupons
  set
    used_count = used_count + 1,
    used_by = v_redemption.user_id,
    used_at = now(),
    is_used =
      case
        when max_uses is not null
         and used_count + 1 >= max_uses
        then true
        else false
      end,
    updated_at = now()
  where id = v_coupon.id;

  return true;
end;
$$;

revoke all
on function public.finalize_coupon_redemption_for_order(uuid)
from public, anon, authenticated;

grant execute
on function public.finalize_coupon_redemption_for_order(uuid)
to service_role;
