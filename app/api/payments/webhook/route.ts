import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  fulfillPaymentByTranRef,
} from "@/lib/payments";

import {
  verifyPayTabsCallbackSignature,
} from "@/lib/paytabs";

export async function POST(
  req: NextRequest
) {
  try {
    const rawBody =
      await req.text();

    const signature =
      req.headers.get(
        "signature"
      );

    if (
      !(await verifyPayTabsCallbackSignature(
        rawBody,
        signature
      ))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid signature",
        },
        {
          status: 401,
        }
      );
    }

    const contentType =
      req.headers.get(
        "content-type"
      ) ?? "";

    let body:
      Record<
        string,
        unknown
      >;

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      body =
        JSON.parse(
          rawBody
        ) as Record<
          string,
          unknown
        >;
    } else {
      body =
        Object.fromEntries(
          new URLSearchParams(
            rawBody
          )
        );
    }

    const tranRef =
      (
        body.tran_ref ??
        body.tranRef
      ) as
        | string
        | undefined;

    if (!tranRef) {
      return NextResponse.json(
        {
          ok: false,
        },
        {
          status: 400,
        }
      );
    }

    const token =
      typeof body.token ===
      "string"
        ? body.token
        : null;

    await fulfillPaymentByTranRef(
      tranRef,
      token
    );

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}
