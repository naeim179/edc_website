import { NextRequest, NextResponse } from "next/server";
import { fulfillPaymentByTranRef } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }

    const tranRef = (body.tran_ref ?? body.tranRef) as string | undefined;

    if (!tranRef) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await fulfillPaymentByTranRef(tranRef);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
