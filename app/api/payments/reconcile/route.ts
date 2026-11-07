import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BATCH_SIZE, CANCELLED_MIN_AGE_MS, reconcileOrder, markChecked, type Config, type OrderRow, type RunState } from "@/lib/paytabs-reconciliation";

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
