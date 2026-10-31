import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillPaymentByTranRef } from "@/lib/payments";

// Verified all-cancelled checkouts close after this age (unchanged).
const CANCELLED_MIN_AGE_MS = 5 * 60 * 1000;

// Hosted page TTL is 5 minutes (paypage_ttl in lib/paytabs.ts). A checkout
// with no transaction, or only final unpaid ones, is closed only after the
// page is certainly dead plus a margin for 3DS and delayed webhooks.
// MUST equal v_min_age in close_expired_unpaid_paytabs_order (SQL).
const EXPIRY_MIN_AGE_MS = 15 * 60 * 1000;

const BATCH_SIZE = 20;

// Second line of defence behind the canary check: at most this many
// closures per run on "no transaction" / "final unpaid" evidence.
const MAX_EXPIRY_CLOSURES_PER_RUN = 10;

// Final PayTabs statuses that can never become a payment (C cancelled,
// D declined, E error, V voided, X expired: see PayTabs "Response_code vs
// Response_status"). Our checkouts are tran_type "sale", so X is unpaid.
// "A" always wins first in classify(); anything else (H, P, unknown)
// leaves the order untouched.
const FINAL_UNPAID = new Set(["C", "D", "E", "V", "X"]);

type Admin = ReturnType<typeof createAdminClient>;

type Config = {
  base: string;
  profileId: number;
  serverKey: string;
};

type OrderRow = {
  id: string;
  created_at: string | null;
};

type GatewayTransaction = {
  cart_id?: unknown;
  tran_ref?: unknown;
  payment_result?: { response_status?: unknown } | null;
};

type QueryOutcome =
  | { kind: "rows"; rows: GatewayTransaction[] }
  | { kind: "empty" }
  | { kind: "error" };

type Verdict =
  | { kind: "approved"; tranRefs: string[] }
  | { kind: "no_transactions" }
  | { kind: "all_cancelled" }
  | { kind: "terminal_unpaid" }
  | { kind: "unresolved"; statuses: string[] };

type Result = "closed" | "expired" | "paid" | "skipped";

type RunState = {
  expiryClosures: number;
  canary: { checked: boolean; ok: boolean };
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

// "No transactions" is accepted ONLY for PayTabs's documented answer:
// HTTP 404 with JSON code 2 and "No entries found". Any other failure
// (429, 5xx, timeout, HTML 404 from a wrong base URL, odd 200 bodies)
// is "error" and never closes anything.
async function queryCart(config: Config, cartId: string): Promise<QueryOutcome> {
  let response: Response;

  try {
    response = await fetch(config.base + "/payment/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config.serverKey,
      },
      body: JSON.stringify({
        profile_id: config.profileId,
        cart_id: cartId,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { kind: "error" };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 404) {
    const obj =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    const message = typeof obj?.message === "string" ? obj.message : "";

    if (Number(obj?.code) === 2 && /no entries found/i.test(message)) {
      return { kind: "empty" };
    }
    return { kind: "error" };
  }

  if (!response.ok) return { kind: "error" };

  const rows = transactionRows(body);
  return rows.length > 0 ? { kind: "rows", rows } : { kind: "error" };
}

// Circuit breaker for the "No entries found" evidence. Before the first
// closure based on it in a run, PayTabs must still find the most recent
// APPROVED checkout by cart_id. If it cannot (wrong profile / key / base
// URL, outage, history unavailable) or there is no approved checkout to
// test with, no-transaction closures are disabled for the whole run.
async function configLooksHealthy(
  admin: Admin,
  config: Config,
  canary: RunState["canary"]
): Promise<boolean> {
  if (canary.checked) return canary.ok;

  canary.checked = true;
  canary.ok = false;

  try {
    const { data: ref } = await admin
      .from("paytabs_payment_attempts")
      .select("id,tran_ref")
      .eq("status", "approved")
      .not("tran_ref", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ref && typeof ref.tran_ref === "string") {
      const outcome = await queryCart(config, ref.id);

      canary.ok =
        outcome.kind === "rows" &&
        outcome.rows.some(
          t =>
            t?.cart_id === ref.id &&
            t?.tran_ref === ref.tran_ref &&
            t?.payment_result?.response_status === "A"
        );
    }
  } catch {
    canary.ok = false;
  }

  if (!canary.ok) {
    console.warn(
      "PayTabs reconciliation canary failed: no-transaction closures disabled for this run"
    );
  }

  return canary.ok;
}

function classify(outcome: QueryOutcome, cartId: string): Verdict | null {
  if (outcome.kind === "error") return null;
  if (outcome.kind === "empty") return { kind: "no_transactions" };

  const statuses: string[] = [];
  const approved: string[] = [];

  for (const t of outcome.rows) {
    const status = t?.payment_result?.response_status;

    if (
      !t ||
      typeof t !== "object" ||
      t.cart_id !== cartId ||
      typeof t.tran_ref !== "string" ||
      t.tran_ref.length === 0 ||
      typeof status !== "string"
    ) {
      // Incomplete or foreign data must NEVER close an order.
      return { kind: "unresolved", statuses: ["invalid"] };
    }

    statuses.push(status);
    if (status === "A") approved.push(t.tran_ref);
  }

  if (approved.length > 0) return { kind: "approved", tranRefs: approved };

  if (statuses.every(s => FINAL_UNPAID.has(s))) {
    return statuses.every(s => s === "C")
      ? { kind: "all_cancelled" }
      : { kind: "terminal_unpaid" };
  }

  return { kind: "unresolved", statuses };
}

async function reconcileOrder(
  admin: Admin,
  config: Config,
  order: OrderRow,
  state: RunState
): Promise<Result> {
  const { data: attempt, error: attemptError } = await admin
    .from("paytabs_payment_attempts")
    .select("id,status,created_at,tran_ref")
    .eq("order_id", order.id)
    .maybeSingle();

  if (attemptError) throw attemptError;

  if (attempt) {
    // approved / requires_review / closed_cancelled are not ours to touch.
    if (
      attempt.tran_ref ||
      !["created", "initiated", "uncertain"].includes(attempt.status)
    ) {
      return "skipped";
    }
  }

  // Orders without an attempt are either aborted checkouts or legacy
  // orders whose PayTabs cart_id was the order id itself.
  const cartId: string = attempt ? attempt.id : order.id;
  const startedAt = attempt?.created_at ?? order.created_at;
  const age = startedAt ? Date.now() - new Date(startedAt).getTime() : NaN;

  if (!Number.isFinite(age) || age < CANCELLED_MIN_AGE_MS) return "skipped";

  const verdict = classify(await queryCart(config, cartId), cartId);
  if (!verdict) return "skipped";

  if (verdict.kind === "unresolved") {
    console.warn(
      "PayTabs reconciliation unresolved statuses",
      order.id.slice(0, 8),
      verdict.statuses.join(",")
    );
    return "skipped";
  }

  if (verdict.kind === "approved") {
    // Recover an approved payment whose callback was missed.
    // The fulfillment function independently verifies PayTabs.
    let fulfilled = false;

    for (const tranRef of verdict.tranRefs) {
      const result = await fulfillPaymentByTranRef(tranRef);
      fulfilled ||= result.paid;
    }

    return fulfilled ? "paid" : "skipped";
  }

  if (verdict.kind === "all_cancelled") {
    if (age >= EXPIRY_MIN_AGE_MS) {
      const { data: done, error } = await admin.rpc(
        "close_expired_unpaid_paytabs_order",
        { p_order_id: order.id, p_attempt_id: attempt ? attempt.id : null }
      );
      if (error) throw error;
      return done === true ? "closed" : "skipped";
    }

    if (attempt?.status === "initiated") {
      const { data: done, error } = await admin.rpc(
        "close_verified_cancelled_paytabs_order",
        { p_order_id: order.id, p_attempt_id: attempt.id }
      );
      if (error) throw error;
      return done === true ? "closed" : "skipped";
    }

    return "skipped";
  }

  // no_transactions or terminal_unpaid: needs the full expiry margin.
  if (age < EXPIRY_MIN_AGE_MS) return "skipped";
  if (state.expiryClosures >= MAX_EXPIRY_CLOSURES_PER_RUN) return "skipped";

  if (
    verdict.kind === "no_transactions" &&
    !(await configLooksHealthy(admin, config, state.canary))
  ) {
    return "skipped";
  }

  const { data: done, error } = await admin.rpc(
    "close_expired_unpaid_paytabs_order",
    { p_order_id: order.id, p_attempt_id: attempt ? attempt.id : null }
  );
  if (error) throw error;

  if (done === true) {
    state.expiryClosures++;
    return "expired";
  }
  return "skipped";
}

async function markChecked(admin: Admin, orderId: string) {
  try {
    const { error } = await admin
      .from("orders")
      .update({ paytabs_last_reconciled_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "pending");

    if (error) {
      console.warn(
        "PayTabs reconciliation could not mark order checked",
        orderId.slice(0, 8),
        error.code ?? "database_error"
      );
    }
  } catch {
    // Best effort: only affects queue ordering; keep processing other orders.
    console.warn("PayTabs reconciliation markChecked request failed", orderId.slice(0, 8));
  }
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

  const config: Config = {
    base: (
      process.env.PAYTABS_BASE_URL || "https://secure-jordan.paytabs.com"
    ).replace(/\/+$/, ""),
    profileId,
    serverKey,
  };

  const cutoff = new Date(Date.now() - CANCELLED_MIN_AGE_MS).toISOString();
  const admin = createAdminClient();

  const { data: orders, error } = await admin
    .from("orders")
    .select("id,created_at")
    .eq("status", "pending")
    .eq("payment_method", "paytabs")
    .eq("source", "manual")
    .lt("created_at", cutoff)
    .order("paytabs_last_reconciled_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const counts = { closed: 0, expired: 0, paid: 0, skipped: 0 };
  const state: RunState = {
    expiryClosures: 0,
    canary: { checked: false, ok: false },
  };
  let errors = 0;

  for (const order of (orders ?? []) as OrderRow[]) {
    try {
      counts[await reconcileOrder(admin, config, order, state)]++;
    } catch {
      errors++;
      console.warn("PayTabs reconciliation skipped order", order.id.slice(0, 8));
    }

    await markChecked(admin, order.id);
  }

  return NextResponse.json({
    ok: true,
    scanned: (orders ?? []).length,
    closed: counts.closed,
    expired: counts.expired,
    paid: counts.paid,
    skipped: counts.skipped,
    errors,
  });
}
