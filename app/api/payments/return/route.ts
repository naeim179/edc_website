import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function redirectToCheckout(
  tranRef?: string | null,
  cancelledCourse?: string | null
) {
  const url = new URL(
    "/checkout/success",
    process.env.SITE_URL ?? "http://localhost:3000"
  );

  if (cancelledCourse) {
    url.searchParams.set("cancelled", "1");
    url.searchParams.set("course", cancelledCourse);
  } else if (tranRef) {
    url.searchParams.set("tranRef", tranRef);
  }

  return NextResponse.redirect(url, 303);
}

function readField(
  fields: Record<string, string>,
  key: string
): string | null {
  const value = fields[key];
  return typeof value === "string" && value.length > 0
    ? value
    : null;
}

function phpEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(
      /[!'()*~]/g,
      ch => "%" + ch.charCodeAt(0).toString(16).toUpperCase()
    )
    .replace(/%20/g, "+");
}

async function validReturnSignature(
  fields: Record<string, string>
): Promise<boolean> {
  const signature = readField(fields, "signature");
  const secret = process.env.PAYTABS_SERVER_KEY;

  if (
    !secret ||
    !signature ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const canonical = Object.entries(fields)
    .filter(
      ([name, value]) =>
        name !== "signature" &&
        value !== "" &&
        value !== "0"
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([name, value]) =>
        phpEncode(name) + "=" + phpEncode(value)
    )
    .join("&");

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(canonical)
    )
  );

  const actual = signature
    .match(/../g)!
    .map(part => parseInt(part, 16));

  let difference = 0;

  for (let i = 0; i < expected.length; i++) {
    difference |= expected[i] ^ actual[i];
  }

  return difference === 0;
}

async function reconcileSignedCancellation(
  cartId: string,
  tranRef: string
): Promise<string | null> {
  if (!UUID.test(cartId) || tranRef.length > 256) {
    return null;
  }

  const profileId = Number(process.env.PAYTABS_PROFILE_ID);
  const serverKey = process.env.PAYTABS_SERVER_KEY;

  if (
    !Number.isInteger(profileId) ||
    profileId <= 0 ||
    !serverKey
  ) {
    return null;
  }

  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from("paytabs_payment_attempts")
    .select("id,order_id")
    .eq("id", cartId)
    .maybeSingle();

  if (attemptError || !attempt) return null;

  const base = (
    process.env.PAYTABS_BASE_URL ||
    "https://secure-jordan.paytabs.com"
  ).replace(/\/+$/, "");

  const response = await fetch(
    base + "/payment/query",
    {
      method: "POST",
      headers: {
        Authorization: serverKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile_id: profileId,
        cart_id: cartId
      }),
      signal: AbortSignal.timeout(10000)
    }
  );

  if (!response.ok) return null;

  const body: unknown = await response.json();

  const obj =
    body &&
    typeof body === "object" &&
    !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};

  const transactions: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(obj.transactions)
      ? obj.transactions
      : typeof obj.tran_ref === "string"
        ? [obj]
        : [];

  if (!transactions.length) return null;

  const allCancelled = transactions.every(value => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const tx = value as Record<string, unknown>;

    const result = tx.payment_result as
      Record<string, unknown> | null | undefined;

    return (
      tx.cart_id === cartId &&
      typeof tx.tran_ref === "string" &&
      tx.tran_ref.length > 0 &&
      result?.response_status === "C"
    );
  });

  const returnedTransactionFound = transactions.some(
    value =>
      value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).tran_ref === tranRef
  );

  if (!allCancelled || !returnedTransactionFound) {
    return null;
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,course_id")
    .eq("id", attempt.order_id)
    .maybeSingle();

  if (orderError || !order) return null;

  const { data: closed, error: closeError } = await admin.rpc(
    "close_verified_cancelled_paytabs_signed_return",
    {
      p_order_id: order.id,
      p_attempt_id: attempt.id
    }
  );

  if (closeError || closed !== true) {
    return null;
  }

  return typeof order.course_id === "string"
    ? order.course_id
    : null;
}

export async function POST(req: NextRequest) {
  let fields: Record<string, string> = {};

  try {
    const contentType =
      req.headers.get("content-type") ?? "";

    if (
      contentType.includes(
        "application/x-www-form-urlencoded"
      )
    ) {
      fields = Object.fromEntries(
        new URLSearchParams(await req.text())
      );
    } else if (
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();

      fields = Object.fromEntries(
        [...form.entries()].filter(
          ([, value]) => typeof value === "string"
        )
      ) as Record<string, string>;
    }
  } catch {
    return redirectToCheckout();
  }

  const tranRef =
    readField(fields, "tranRef") ??
    readField(fields, "tran_ref");

  const cartId = readField(fields, "cartId");

  if (
    readField(fields, "respStatus") === "C" &&
    cartId &&
    tranRef
  ) {
    try {
      if (await validReturnSignature(fields)) {
        const courseId =
          await reconcileSignedCancellation(
            cartId,
            tranRef
          );

        if (courseId) {
          return redirectToCheckout(null, courseId);
        }
      }
    } catch {
      // Leave uncertain payments untouched.
      // The five-minute Cron remains the fallback.
    }
  }

  return redirectToCheckout(tranRef);
}

// Unsigned GET parameters must never change payment state.
export async function GET(req: NextRequest) {
  return redirectToCheckout(
    req.nextUrl.searchParams.get("tranRef") ??
    req.nextUrl.searchParams.get("tran_ref")
  );
}
