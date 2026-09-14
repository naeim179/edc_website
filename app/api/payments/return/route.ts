import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let body: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const form = await req.formData();
    body = Object.fromEntries(form.entries());
  }

  const tranRef = (body.tranRef ?? body.tran_ref) as string | undefined;

  const siteUrl =
    process.env.SITE_URL ?? "http://localhost:3000";

  if (!tranRef) {
    return NextResponse.redirect(
      `${siteUrl}/checkout/success`
    );
  }

  return NextResponse.redirect(
    `${siteUrl}/checkout/success?tranRef=${encodeURIComponent(tranRef)}`
  );
}
