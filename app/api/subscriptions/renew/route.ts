import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  createRecurringPayment,
  queryTransaction,
} from "@/lib/paytabs";

import {
  fulfillPaymentByTranRef,
} from "@/lib/payments";

type RenewalClaim = { subscription_id: string; claim_id: string };
type StartedRenewal = { order_id: string; duration_months: number; amount: number; currency: string; token: string; token_tran_ref: string };

export async function GET(
  request: NextRequest
) {
  const secret =
    process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET is not configured",
      },
      {
        status: 503,
      }
    );
  }

  if (
    request.headers.get(
      "authorization"
    ) !==
    `Bearer ${secret}`
  ) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 401,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "claim_subscription_renewals_v2",
    {
      p_limit: 50,
    }
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  const claims =
    (
      data ??
      []
    ) as RenewalClaim[];

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (
    const claim of claims
  ) {
    let orderId: string | null = null;
    let paymentTranRef: string | null = null;

    try {
      const { data: started, error: startError } = await admin.rpc("begin_subscription_renewal", {
        p_subscription_id: claim.subscription_id, p_claim_id: claim.claim_id,
      });
      if (startError) throw new Error(startError.message);
      if (!started) { skipped++; continue; }
      const payment = started as StartedRenewal;
      const order = { id: payment.order_id };
      orderId = order.id;

      const response =
        await createRecurringPayment(
          {
            orderId:
              order.id,

            amount:
              Number(
                payment.amount
              ),

            currency:
              payment.currency,

            description:
              `${payment.duration_months} month subscription renewal`,

            token:
              payment.token,

            tokenTranRef:
              payment.token_tran_ref,
          }
        );

      const tranRef =
        typeof response
          ?.tran_ref ===
        "string"
          ? response.tran_ref
          : null;

      paymentTranRef = tranRef;
      if (!tranRef) {
        throw new Error(
          "PayTabs did not return tran_ref"
        );
      }

      const fulfillment =
        await fulfillPaymentByTranRef(
          tranRef
        );

      if (!fulfillment.paid) {
        // Only PayTabs's verified transaction query can prove rejection.
        // Pending / ambiguous / approved-but-unfulfilled require review.
        const verified = await queryTransaction(tranRef);
        if (verified?.tran_ref !== tranRef || verified?.cart_id !== order.id ||
            Number(verified?.cart_amount) !== Number(payment.amount) ||
            typeof verified?.cart_currency !== "string" ||
            verified.cart_currency.toUpperCase() !== payment.currency.toUpperCase()) {
          throw new Error("Recurring payment query does not match renewal order");
        }
        const status = verified?.payment_result?.response_status;
        if (typeof status === "string" && status !== "A" &&
            status !== "P" && status !== "H") {
          const { data: rejected, error: rejectError } = await admin
            .from("orders")
            .update({ status: "failed", paytabs_tran_ref: tranRef })
            .eq("id", order.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (rejectError) throw new Error(rejectError.message);
          if (rejected) {
            const { error: failureError } = await admin.rpc(
              "record_subscription_renewal_failure",
              { p_subscription_id: claim.subscription_id }
            );
            if (failureError) throw new Error(failureError.message);
          }
          failed++;
          continue;
        }
        throw new Error("Recurring payment requires verification or review");
      }

      successful++;
    } catch {
      failed++;
      // An exception or missing transaction reference is NOT proof that
      // PayTabs did not charge the card. Preserve the pending order so the
      // renewal claim cannot charge it again; require reconciliation.
      if (orderId) {
        const { error: reviewError } = await admin
          .from("paytabs_fulfillment_reviews")
          .upsert({
            order_id: orderId,
            tran_ref: paymentTranRef ?? `RENEWAL-UNKNOWN-${orderId}`,
            reason: "RENEWAL_RESULT_UNCERTAIN",
          }, { onConflict: "tran_ref", ignoreDuplicates: true });
        if (reviewError) {
          throw new Error(`Renewal reconciliation logging failed: ${reviewError.message}`);
        }
      }
      // Do not increment renewal_failures until a decline is verified.

    }
  }

  return NextResponse.json({
    ok: true,
    processed:
      claims.length,
    successful,
    failed,
    skipped,
  });
}
