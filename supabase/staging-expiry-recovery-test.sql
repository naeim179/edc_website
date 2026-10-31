-- YOUR WAY - STAGING ONLY, never run against production.
-- Strict SQL assertions (raise an error on unexpected behavior), all inside
-- a transaction which is ROLLED BACK on success. On failure, ON_ERROR_STOP
-- exits psql and the disconnected session rolls back automatically.
--
-- Create a disposable, UNPAID, staging-only PayTabs test order/attempt first.
-- Use a test-only database and test-only gateway; do not use a customer's order.
-- Both records must be older than 15 minutes. The script DOES NOT call PayTabs.
--
-- psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 \
--   -v order_id=<uuid> -v attempt_id=<uuid> \
--   -f supabase/staging-expiry-recovery-test.sql
--
-- This tests SQL behavior, NOT whether a real PayTabs 3DS approval can be
-- delayed, or whether the HTTP reconciler queries the gateway correctly.

\set ON_ERROR_STOP on
BEGIN;

-- psql safely quotes values, rather than injecting UUID values into PL/pgSQL.
SELECT set_config('yourway_expiry_test.order_id', :'order_id', true);
SELECT set_config('yourway_expiry_test.attempt_id', :'attempt_id', true);

DO $test$
DECLARE
  v_order_id uuid := current_setting('yourway_expiry_test.order_id')::uuid;
  v_attempt_id uuid := current_setting('yourway_expiry_test.attempt_id')::uuid;
  v_order public.orders%rowtype;
  v_attempt public.paytabs_payment_attempts%rowtype;
  v_closed boolean;
  v_closed_again boolean;
  v_result text;
  v_tran_ref text := 'TEST-LATE-' || gen_random_uuid()::text;
  v_reviews integer;
  v_reason text;
  v_coupon_reserved_before integer;
  v_coupon_released_after integer;
  v_enrollments_before jsonb;
  v_enrollments_after jsonb;
  v_subscriptions_before jsonb;
  v_subscriptions_after jsonb;
  v_booking_status text;
  v_blocked boolean := false;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IS DISTINCT FROM 'pending'
     OR v_order.payment_method IS DISTINCT FROM 'paytabs'
     OR v_order.source IS DISTINCT FROM 'manual'
     OR v_order.paytabs_tran_ref IS NOT NULL
     OR v_order.fulfilled_at IS NOT NULL
     OR v_order.paytabs_closed_cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'TEST FAILED: expected an unpaid, pending manual PayTabs order';
  END IF;

  SELECT * INTO v_attempt FROM public.paytabs_payment_attempts
  WHERE id = v_attempt_id AND order_id = v_order_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.status NOT IN ('created', 'initiated', 'uncertain')
     OR v_attempt.tran_ref IS NOT NULL
     OR v_attempt.created_at IS NULL
     OR v_attempt.created_at > now() - interval '15 minutes'
     OR v_order.created_at IS NULL
     OR v_order.created_at > now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'TEST FAILED: expected a test-only attempt older than 15 minutes';
  END IF;

  IF EXISTS (SELECT 1 FROM public.paytabs_fulfillment_reviews
             WHERE order_id = v_order_id)
     OR EXISTS (SELECT 1 FROM public.coupon_redemptions
                WHERE order_id = v_order_id AND status = 'redeemed') THEN
    RAISE EXCEPTION 'TEST FAILED: fixture is already reviewed or has a redeemed coupon';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id), '[]'::jsonb)
    INTO v_enrollments_before FROM public.enrollments e
    WHERE e.student_id = v_order.user_id AND e.course_id = v_order.course_id;
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::jsonb)
    INTO v_subscriptions_before FROM public.subscriptions s
    WHERE s.student_id = v_order.user_id AND s.course_id = v_order.course_id;
  SELECT count(*) INTO v_coupon_reserved_before
    FROM public.coupon_redemptions
    WHERE order_id = v_order_id AND status = 'reserved';

  SELECT public.close_expired_unpaid_paytabs_order(v_order_id, v_attempt_id)
    INTO v_closed;
  IF v_closed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'TEST FAILED: first closure should return true';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = v_order_id
      AND status = 'failed'
      AND paytabs_closed_cancelled_at IS NOT NULL
      AND paytabs_closed_reason = 'expired_unpaid'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: order did not get failed / expired_unpaid closure';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.paytabs_payment_attempts
    WHERE id = v_attempt_id AND status = 'closed_cancelled'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: attempt was not closed_cancelled';
  END IF;

  SELECT count(*) INTO v_coupon_released_after
    FROM public.coupon_redemptions
    WHERE order_id = v_order_id AND status = 'released';
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions
             WHERE order_id = v_order_id AND status = 'reserved')
     OR v_coupon_released_after < v_coupon_reserved_before THEN
    RAISE EXCEPTION 'TEST FAILED: reserved coupon was not released';
  END IF;

  IF v_order.private_booking_id IS NOT NULL THEN
    SELECT status INTO v_booking_status FROM public.private_course_bookings
    WHERE id = v_order.private_booking_id;
    IF v_booking_status NOT IN ('cancelled', 'expired') THEN
      RAISE EXCEPTION 'TEST FAILED: Private booking hold was not released';
    END IF;
  END IF;
  RAISE NOTICE 'PASS: expired checkout closed and coupon/booking released';

  SELECT public.close_expired_unpaid_paytabs_order(v_order_id, v_attempt_id)
    INTO v_closed_again;
  IF v_closed_again IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'TEST FAILED: repeat closure should return false';
  END IF;
  RAISE NOTICE 'PASS: repeated closure is idempotent';

  -- Call the actual database wrapper with a SYNTHETIC reference. This is
  -- ONLY a staging DB-level simulation, not a PayTabs-approved transaction.
  SELECT result_state INTO v_result
  FROM public.fulfill_verified_paytabs_order(
    v_order_id, v_attempt_id, v_tran_ref, v_order.amount, v_order.currency, null
  );
  IF v_result IS DISTINCT FROM 'review' THEN
    RAISE EXCEPTION 'TEST FAILED: late approval returned %, expected review', v_result;
  END IF;

  SELECT count(*), max(reason) INTO v_reviews, v_reason
  FROM public.paytabs_fulfillment_reviews
  WHERE tran_ref = v_tran_ref AND order_id = v_order_id AND attempt_id = v_attempt_id;
  IF v_reviews <> 1 OR v_reason IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: late approval did not create one review';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.paytabs_payment_attempts
    WHERE id = v_attempt_id AND status = 'requires_review'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: late approval attempt did not require review';
  END IF;
  RAISE NOTICE 'PASS: simulated late approval sent to review (reason=%)', v_reason;

  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id), '[]'::jsonb)
    INTO v_enrollments_after FROM public.enrollments e
    WHERE e.student_id = v_order.user_id AND e.course_id = v_order.course_id;
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::jsonb)
    INTO v_subscriptions_after FROM public.subscriptions s
    WHERE s.student_id = v_order.user_id AND s.course_id = v_order.course_id;
  IF v_enrollments_after IS DISTINCT FROM v_enrollments_before
     OR v_subscriptions_after IS DISTINCT FROM v_subscriptions_before
     OR NOT EXISTS (SELECT 1 FROM public.orders
                    WHERE id = v_order_id AND status = 'failed'
                      AND fulfilled_at IS NULL) THEN
    RAISE EXCEPTION 'TEST FAILED: late approval changed enrollment/subscription/order';
  END IF;
  RAISE NOTICE 'PASS: no enrollment/subscription changes after late approval';

  -- Expected trigger exception is caught by a PL/pgSQL subtransaction.
  -- An unexpected error is re-raised; a successful UPDATE fails the test.
  BEGIN
    UPDATE public.orders SET status = 'paid' WHERE id = v_order_id;
  EXCEPTION WHEN OTHERS THEN
    IF position('PAYTABS_LATE_APPROVAL_REQUIRES_REVIEW' IN SQLERRM) > 0 THEN
      v_blocked := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST FAILED: closed order could be directly reactivated';
  END IF;
  RAISE NOTICE 'PASS: database blocks direct closed-order reactivation';
END;
$test$;

ROLLBACK;
\echo 'ALL CHECKS PASSED. Transaction ROLLED BACK; test data unchanged.'
