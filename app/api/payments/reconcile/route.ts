import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillPaymentByTranRef } from "@/lib/payments";

const MIN_AGE_MS = 5 * 60 * 1000;

type GatewayTransaction = {
  cart_id?: unknown;
  tran_ref?: unknown;
  payment_result?: { response_status?: unknown };
};

function transactionRows(value: unknown): GatewayTransaction[] {
  if (Array.isArray(value)) return value as GatewayTransaction[];
  if (!value || typeof value !== "object") return [];

  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.transactions)) {
    return obj.transactions as GatewayTransaction[];
  }
  if (typeof obj.tran_ref === "string") {
    return [obj as GatewayTransaction];
  }
  return [];
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const profileId = Number(process.env.PAYTABS_PROFILE_ID);
  const serverKey = process.env.PAYTABS_SERVER_KEY;

  if (!Number.isInteger(profileId) || profileId <= 0 || !serverKey) {
    return NextResponse.json(
      { ok: false, error: "Missing PayTabs config" },
      { status: 503 }
    );
  }

  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();
  const base = (
    process.env.PAYTABS_BASE_URL ||
    "https://secure-jordan.paytabs.com"
  ).replace(/\/+$/, "");

  const admin = createAdminClient();

  const { data: orders, error } = await admin
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .eq("payment_method", "paytabs")
    .eq("source", "manual")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let closed = 0;
  let paid = 0;
  let skipped = 0;
  let errors = 0;

  for (const order of orders ?? []) {
    try {
      const { data: attempt, error: attemptError } = await admin
        .from("paytabs_payment_attempts")
        .select("id,status,created_at,payment_url,tran_ref")
        .eq("order_id", order.id)
        .maybeSingle();

      if (attemptError) throw attemptError;

      const age = attempt
        ? Date.now() - new Date(attempt.created_at).getTime()
        : NaN;

      if (
        !attempt ||
        attempt.status !== "initiated" ||
        !attempt.payment_url ||
        attempt.tran_ref ||
        !Number.isFinite(age) ||
        age < MIN_AGE_MS
      ) {
        skipped++;
        continue;
      }

      const response = await fetch(base + "/payment/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: serverKey,
        },
        body: JSON.stringify({
          profile_id: profileId,
          cart_id: attempt.id,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        skipped++;
        continue;
      }

      const transactions = transactionRows(await response.json());

      // Unknown or incomplete gateway results must NEVER close an order.
      if (
        transactions.length === 0 ||
        !transactions.every(t =>
          t &&
          typeof t === "object" &&
          t.cart_id === attempt.id &&
          typeof t.tran_ref === "string" &&
          t.tran_ref.length > 0 &&
          typeof t.payment_result?.response_status === "string"
        )
      ) {
        skipped++;
        continue;
      }

      if (
        transactions.every(
          t => t.payment_result?.response_status === "C"
        )
      ) {
        const { data: done, error: closeError } = await admin.rpc(
          "close_verified_cancelled_paytabs_order",
          {
            p_order_id: order.id,
            p_attempt_id: attempt.id,
          }
        );

        if (closeError) throw closeError;

        if (done === true) closed++;
        else skipped++;
      } else {
        // Recover an approved payment if its callback was missed.
        // The fulfillment function independently verifies PayTabs.
        let fulfilled = false;

        for (const transaction of transactions) {
          if (
            transaction.payment_result?.response_status === "A" &&
            typeof transaction.tran_ref === "string"
          ) {
            const result =
              await fulfillPaymentByTranRef(transaction.tran_ref);

            fulfilled ||= result.paid;
          }
        }

        if (fulfilled) paid++;
        else skipped++;
      }
    } catch {
      errors++;
      console.warn(
        "PayTabs reconciliation skipped order",
        order.id.slice(0, 8)
      );
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: (orders ?? []).length,
    closed,
    paid,
    skipped,
    errors,
  });
}
