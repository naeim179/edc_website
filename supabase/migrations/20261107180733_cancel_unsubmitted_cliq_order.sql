-- Owner cancellation is serialized with proof submission and admin approval.
-- No existing orders are changed by this migration.
alter table public.orders add column cliq_cancelled_at timestamptz;
create function public.cancel_unsubmitted_cliq_order(p_order_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.user_id is distinct from auth.uid()
 or v_order.payment_method is distinct from 'cliq' or v_order.source is distinct from 'manual'
 then raise exception 'CLIQ_ORDER_UNAVAILABLE'; end if;
 if v_order.status='failed' and v_order.cliq_cancelled_at is not null then return v_order.course_id; end if;
 if v_order.status<>'pending' or v_order.fulfilled_at is not null
 or v_order.payment_proof is not null or v_order.private_booking_id is not null
 then raise exception 'CLIQ_ORDER_NOT_CANCELLABLE'; end if;
 update public.orders set status='failed',cliq_cancelled_at=now() where id=p_order_id;
 perform public.release_coupon_reservation_for_order(p_order_id);
 return v_order.course_id;
end $$;
revoke all on function public.cancel_unsubmitted_cliq_order(uuid) from public,anon;
grant execute on function public.cancel_unsubmitted_cliq_order(uuid) to authenticated;
