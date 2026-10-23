import { createAdminClient } from "@/lib/supabase/admin";
import { queryTransaction } from "@/lib/paytabs";

function unpaidResult() {
  return {
    paid: false as const,
    courseId: null as string | null,
    expiresAt: null as string | null,
    autoRenew: false,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only PayTabs's server-side /payment/query response is used as evidence
// of approval. Return URLs and callback bodies are never trusted as proof.
export async function fulfillPaymentByTranRef(
  tranRef: string,
  callbackToken?: string | null,
  expectedUserId?: string | null
) {
  if (!tranRef || tranRef.length > 256) return unpaidResult();

  const result = await queryTransaction(tranRef);
  const responseStatus = result?.payment_result?.response_status;
  const cartId = typeof result?.cart_id === "string" ? result.cart_id : "";

  if (responseStatus !== "A") {
    // Decline of one transaction does not close a PayTabs payment page.
    // Another transaction on the same page may still succeed later.
    return unpaidResult();
  }

  const admin = createAdminClient();

  const markForReview = async (
    reason: string,
    orderId: string | null,
    attemptId: string | null
  ) => {
    const { error } = await admin.from("paytabs_fulfillment_reviews").upsert(
      { tran_ref: tranRef, reason, order_id: orderId, attempt_id: attemptId },
      { onConflict: "tran_ref", ignoreDuplicates: true }
    );
    if (error) throw new Error(`PayTabs review recording failed: ${error.message}`);
    return unpaidResult();
  };

  if (!UUID.test(cartId)) {
    if (expectedUserId) return unpaidResult();
    return markForReview("APPROVED_INVALID_CART_ID", null, null);
  }

  // New checkout: cart_id is the immutable attempt UUID.
  const { data: attempt, error: attemptError } = await admin
    .from("paytabs_payment_attempts")
    .select("id,order_id")
    .eq("id", cartId)
    .maybeSingle();
  if (attemptError) throw new Error(attemptError.message);

  const orderId = attempt?.order_id ?? cartId;
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,course_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);

  // A public return URL must not let one student process another's sale.
  // Trusted signed webhooks and the renewal worker do not pass this option.
  if (expectedUserId && (!order || order.user_id !== expectedUserId)) {
    return unpaidResult();
  }

  if (!order) {
    return markForReview("APPROVED_ORDER_NOT_FOUND", null, attempt?.id ?? null);
  }

  const amount = Number(result?.cart_amount);
  const currency =
    typeof result?.cart_currency === "string"
      ? result.cart_currency.toUpperCase()
      : "";
  if (!Number.isFinite(amount) || amount <= 0 || !currency) {
    return markForReview("APPROVED_INVALID_AMOUNT_OR_CURRENCY", order.id, attempt?.id ?? null);
  }

  const token =
    callbackToken || (typeof result?.token === "string" ? result.token : null);

  const { data: rows, error: fulfillmentError } = await admin.rpc(
    "fulfill_verified_paytabs_order",
    {
      p_order_id: order.id,
      p_attempt_id: attempt?.id ?? null,
      p_tran_ref: tranRef,
      p_amount: amount,
      p_currency: currency,
      p_token: token,
    }
  );
  if (fulfillmentError) {
    // The DB RPC handles ordinary business conflicts atomically and records
    // review rows. Unexpected DB errors must propagate so webhooks retry.
    throw new Error(fulfillmentError.message);
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row?.result_state !== "paid") return unpaidResult();

  return {
    paid: true as const,
    courseId: order.course_id as string,
    expiresAt: row.subscription_expires_at ?? null,
    autoRenew: Boolean(row.subscription_auto_renew),
  };
}
