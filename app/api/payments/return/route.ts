import { NextRequest, NextResponse } from "next/server";

function toSuccess(tranRef?: string | null) {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const url = new URL("/checkout/success", siteUrl);

  if (tranRef) {
    url.searchParams.set("tranRef", tranRef);
  }

  // 303 يحوّل الـ POST إلى GET (307 كان يبقي POST فيعطي 405)
  return NextResponse.redirect(url, 303);
}

function pick(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};

  try {
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    // جسم فارغ أو غير صالح: نكمل بدون tranRef
  }

  return toSuccess(pick(body.tranRef) ?? pick(body.tran_ref));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return toSuccess(params.get("tranRef") ?? params.get("tran_ref"));
}
