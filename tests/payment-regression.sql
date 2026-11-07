-- Run only against the disposable database created by run-db-tests.sh.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('d0000000-0000-4000-8000-000000000001','payment-regression@example.test');
insert into public.courses(id,title,is_published,is_free,price,course_type)
 values('d1000000-0000-4000-8000-000000000001','Payment regression',true,false,25,'group');
do $$
declare
 student constant uuid := 'd0000000-0000-4000-8000-000000000001';
 course constant uuid := 'd1000000-0000-4000-8000-000000000001';
 oid uuid; aid uuid; oid2 uuid; aid2 uuid; expiry timestamptz; result record; n integer;
begin
 -- Only trusted server code can finalize money or read stored payment tokens.
 if has_function_privilege('authenticated','public.fulfill_verified_paytabs_order(uuid,uuid,text,numeric,text,text)','execute')
 or has_function_privilege('anon','public.fulfill_verified_cliq_order(uuid)','execute')
 or has_table_privilege('authenticated','public.subscription_payment_tokens','select') then
   raise exception 'Payment boundary exposed';
 end if;
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,auto_renew_requested)
 values(student,course,25,'USD','pending',1,'paytabs','manual',true) returning id into oid;
 aid := begin_paytabs_checkout_attempt(oid,student,25,'USD',1,null,null,true);
 begin
   perform begin_paytabs_checkout_attempt(oid,student,25,'USD',1,null,null,true);
   raise exception 'Duplicate checkout allowed';
 exception when others then if sqlerrm <> 'PAYTABS_CHECKOUT_ALREADY_STARTED' then raise; end if; end;
 begin update orders set amount=1 where id=oid; raise exception 'Snapshot mutable';
 exception when others then if sqlerrm <> 'PAYTABS_ORDER_SNAPSHOT_LOCKED' then raise; end if; end;
 if close_expired_unpaid_paytabs_order(oid,aid) then raise exception 'Live checkout prematurely closed'; end if;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-AMOUNT',24,'USD',null);
 if result.result_state <> 'review' or exists(select 1 from enrollments where student_id=student) then raise exception 'Amount mismatch enrolled'; end if;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-CURRENCY',25,'JOD',null);
 if result.result_state <> 'review' then raise exception 'Currency mismatch accepted'; end if;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-APPROVED',25,'USD','test-token');
 if result.result_state <> 'paid' or not result.subscription_auto_renew then raise exception 'Valid payment failed'; end if;
 expiry := result.subscription_expires_at;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-APPROVED',25,'USD','test-token');
 if result.subscription_expires_at <> expiry then raise exception 'Duplicate callback extended twice'; end if;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-SECOND-TRANSACTION',25,'USD',null);
 if result.result_state <> 'review' or (select expires_at from subscriptions where student_id=student and course_id=course) <> expiry then raise exception 'Additional transaction extended twice'; end if;
 if (select count(*) from enrollments where student_id=student and course_id=course) <> 1 then raise exception 'Enrollment duplication'; end if;
 -- A new legitimate purchase extends from current expiry by calendar months.
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,auto_renew_requested)
 values(student,course,75,'USD','pending',3,'paytabs','manual',false) returning id into oid2;
 aid2 := begin_paytabs_checkout_attempt(oid2,student,75,'USD',3,null,null,false);
 select * into result from fulfill_verified_paytabs_order(oid2,aid2,'REG-RENEW',75,'USD',null);
 if result.result_state <> 'paid' or result.subscription_expires_at <> add_calendar_months_clamped(expiry,3) or result.subscription_auto_renew then raise exception 'Manual renewal incorrect'; end if;
 -- Expiry recovery closes only an eligible, old, unpaid attempt.
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,created_at)
 values(student,course,25,'USD','pending',1,'paytabs','manual',now()-interval '30 minutes') returning id into oid;
 aid := begin_paytabs_checkout_attempt(oid,student,25,'USD',1,null,null,false);
 update paytabs_payment_attempts set created_at=now()-interval '30 minutes' where id=aid;
 if not close_expired_unpaid_paytabs_order(oid,aid) then raise exception 'Expired unpaid checkout not closed'; end if;
 if close_expired_unpaid_paytabs_order(oid,aid) then raise exception 'Repeated expiry closure succeeded'; end if;
 if (select status from orders where id=oid)<>'failed' then raise exception 'Expired status incorrect'; end if;
 -- CliQ approvals are idempotent and cannot approve a failed order.
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,payment_proof)
 values(student,course,25,'USD','pending',1,'cliq','manual',student||'/proof.png') returning id into oid;
 select * into result from fulfill_verified_cliq_order(oid);
 expiry := result.subscription_expires_at;
 select * into result from fulfill_verified_cliq_order(oid);
 if result.subscription_expires_at <> expiry then raise exception 'CliQ extended twice'; end if;
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source)
 values(student,course,25,'USD','failed',1,'cliq','manual') returning id into oid;
 begin perform fulfill_verified_cliq_order(oid); raise exception 'Failed CliQ approved';
 exception when others then if sqlerrm <> 'CLIQ_ORDER_NOT_PENDING' then raise; end if; end;
 -- A pending payment blocks automatic renewal. Repeated claims do not charge again.
 insert into subscription_payment_tokens(subscription_id,token,token_tran_ref) select id,'test-renewal-token','REG-RENEW' from subscriptions where student_id=student and course_id=course on conflict(subscription_id) do update set token=excluded.token,token_tran_ref=excluded.token_tran_ref;
 update subscriptions set auto_renew=true,expires_at=now()+interval '1 hour',renewal_attempted_at=null where student_id=student and course_id=course;
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source)
 values(student,course,25,'USD','pending',1,'paytabs','auto_renew') returning id into oid;
 select count(*) into n from claim_due_subscription_renewals(50);
 if n<>0 then raise exception 'Pending renewal claimed twice'; end if;
 update orders set status='failed' where id=oid;
 select count(*) into n from claim_due_subscription_renewals(50);
 if n<>1 then raise exception 'Eligible renewal not claimed'; end if;
 select count(*) into n from claim_due_subscription_renewals(50);
 if n<>0 then raise exception 'Repeated renewal claim accepted'; end if;
 -- A discount reserves capacity once and becomes redeemed only on approval.
 insert into course_coupons(code,course_id,coupon_type,discount_type,discount_value,subscription_months,max_uses)
 values('REG-DISCOUNT',course,'discount','percentage',20,null,1);
 insert into orders(user_id,course_id,amount,original_amount,currency,status,subscription_months,payment_method,source)
 values(student,course,25,25,'USD','pending',1,'paytabs','manual') returning id into oid;
 perform reserve_discount_coupon_for_order('REG-DISCOUNT',student,course,oid,25,90);
 if (select amount from orders where id=oid)<>20 then raise exception 'Discount price incorrect'; end if;
 aid := begin_paytabs_checkout_attempt(oid,student,20,'USD',1,(select coupon_id from orders where id=oid),null,false);
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-COUPON',20,'USD',null);
 if result.result_state<>'paid' or (select used_count from course_coupons where code='REG-DISCOUNT')<>1 then raise exception 'Coupon fulfillment failed'; end if;
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-COUPON',20,'USD',null);
 if (select used_count from course_coupons where code='REG-DISCOUNT')<>1 then raise exception 'Coupon redeemed twice'; end if;
 insert into course_coupons(code,course_id,coupon_type,subscription_months,max_uses)
 values('REG-FREE',course,'free_subscription',1,1);
 select * into result from redeem_free_course_coupon('REG-FREE',student,course,null);
 if result.granted_months<>1 or (select used_count from course_coupons where code='REG-FREE')<>1 then raise exception 'Free coupon failed'; end if;
 begin perform redeem_free_course_coupon('REG-FREE',student,course,null); raise exception 'Free coupon used twice';
 exception when others then if sqlerrm <> 'COUPON_ALREADY_USED' then raise; end if; end;
 -- Private payment commits enrollment and both reserved appointments together.
 insert into courses(title,is_published,is_free,price,course_type) values('Private payment regression',true,false,25,'private') returning id into oid2;
 insert into private_course_bookings(course_id,student_id,hold_expires_at) values(oid2,student,now()+interval '1 hour') returning id into aid2;
 insert into private_booking_slots(booking_id,day_of_week,start_time,end_time) values(aid2,1,'10:00','11:00'),(aid2,3,'10:00','11:00');
 insert into orders(user_id,course_id,amount,currency,status,subscription_months,payment_method,source,private_booking_id)
 values(student,oid2,25,'USD','pending',1,'paytabs','manual',aid2) returning id into oid;
 aid := begin_paytabs_checkout_attempt(oid,student,25,'USD',1,null,aid2,false);
 select * into result from fulfill_verified_paytabs_order(oid,aid,'REG-PRIVATE',25,'USD',null);
 if result.result_state<>'paid' or (select status from private_course_bookings where id=aid2)<>'confirmed' or not exists(select 1 from enrollments where student_id=student and course_id=oid2) then raise exception 'Private atomic fulfillment failed'; end if;
 raise notice 'Payment regression: approval, amount/currency, snapshots, idempotency, expiry, CliQ and renewal passed';
end $$;
rollback;
