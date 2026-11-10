"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileOwnedPaytabsOrder } from "@/lib/paytabs-reconciliation";
import { checkoutCookieName, clearHostedCheckout } from "@/lib/checkout-recovery-cookie";

export type CheckoutRecovery = {
  state: "ready" | "pending" | "paid" | "cliq" | "review" | "reschedule";
  orderId?: string;
  canResume?: boolean;
};

// Browser Back is a navigation event, never financial evidence. Only the
// existing provider verification may release an unfinished card checkout.
export async function inspectCheckoutPayment(courseId: string, watchedOrderId?: string): Promise<CheckoutRecovery> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const db = createAdminClient();
  const saved = (await cookies()).get(checkoutCookieName(courseId))?.value;
  const validId = (value?: string) => Boolean(value && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value));
  const remembered = validId(watchedOrderId) ? watchedOrderId : validId(saved) ? saved : undefined;
  let privateRetry = false;
  if (remembered) {
    const { data: previous, error } = await db.from("orders")
      .select("id,status,payment_method,paytabs_closed_cancelled_at,private_booking_id").eq("id", remembered).eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
    if (error) throw new Error(error.message);
    privateRetry = Boolean(previous?.status === "failed" && previous.paytabs_closed_cancelled_at && previous.private_booking_id);
    if (previous?.status === "failed" && previous.payment_method === "paytabs" && !previous.paytabs_closed_cancelled_at) return { state: "review", orderId: previous.id };
    if (previous?.status === "paid") {
      await clearHostedCheckout(courseId);
      return { state: "paid", orderId: previous.id };
    }
  }

  const { data: pending, error } = await db.from("orders")
    .select("id,payment_method,source,paytabs_last_reconciled_at").eq("user_id", user.id).eq("course_id", courseId).eq("status", "pending").maybeSingle();
  if (error) throw new Error(error.message);
  if (!pending) {
    // A callback can settle the order between the first read and the pending
    // lookup. Re-read the watched order before allowing an automatic retry.
    if (remembered) {
      const { data: latest, error: latestError } = await db.from("orders")
        .select("id,status,payment_method,paytabs_closed_cancelled_at,private_booking_id")
        .eq("id", remembered).eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
      if (latestError) throw new Error(latestError.message);
      if (latest?.status === "paid") {
        await clearHostedCheckout(courseId);
        return { state: "paid", orderId: latest.id };
      }
      if (latest?.status === "pending") return { state: "pending", orderId: latest.id };
      if (latest?.status === "failed" && latest.payment_method === "paytabs" && !latest.paytabs_closed_cancelled_at) return { state: "review", orderId: latest.id };
      privateRetry = Boolean(latest?.status === "failed" && latest.paytabs_closed_cancelled_at && latest.private_booking_id);
      await clearHostedCheckout(courseId);
    }
    return { state: privateRetry ? "reschedule" : "ready" };
  }
  if (pending.payment_method === "cliq") return { state: "cliq", orderId: pending.id };
  if (pending.payment_method !== "paytabs" || pending.source !== "manual") {
    return { state: "pending", orderId: pending.id };
  }

  const lastChecked = new Date(pending.paytabs_last_reconciled_at ?? "").getTime();
  if (!Number.isFinite(lastChecked) || Date.now() - lastChecked >= 20_000) {
    await reconcileOwnedPaytabsOrder(pending.id, user.id);
  }
  const { data: current, error: currentError } = await db.from("orders")
    .select("id,status,paytabs_closed_cancelled_at,private_booking_id").eq("id", pending.id).eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message ?? "Payment state unavailable");
  if (current.status === "paid") {
    await clearHostedCheckout(courseId);
    return { state: "paid", orderId: current.id };
  }
  if (current.status === "failed" && current.paytabs_closed_cancelled_at) {
    await clearHostedCheckout(courseId);
    return { state: current.private_booking_id ? "reschedule" : "ready" };
  }
  const { data: attempt, error: attemptError } = await db.from("paytabs_payment_attempts")
    .select("status,created_at,payment_url").eq("order_id", current.id).maybeSingle();
  if (attemptError) throw new Error(attemptError.message);
  if (attempt?.status === "requires_review" || attempt?.status === "approved") {
    return { state: "review", orderId: current.id };
  }
  const age = new Date(attempt?.created_at ?? "").getTime();
  const canResume = attempt?.status === "initiated" && Boolean(attempt.payment_url) && Number.isFinite(age) && Date.now() - age >= 0 && Date.now() - age < 4 * 60 * 1000;
  return { state: "pending", orderId: current.id, canResume };
}
