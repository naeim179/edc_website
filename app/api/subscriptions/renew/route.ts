import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  createRecurringPayment,
} from "@/lib/paytabs";

import {
  fulfillPaymentByTranRef,
} from "@/lib/payments";

type RenewalClaim = {
  subscription_id: string;
  student_id: string;
  course_id: string;

  duration_months: number;

  amount: number;
  currency: string;

  expires_at: string;

  token: string;
  token_tran_ref: string;
};

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
    "claim_due_subscription_renewals",
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

  for (
    const claim of claims
  ) {
    let orderId:
      string | null = null;

    try {
      const {
        data: order,
        error:
          orderError,
      } = await admin
        .from("orders")
        .insert({
          user_id:
            claim.student_id,

          course_id:
            claim.course_id,

          amount:
            claim.amount,

          currency:
            claim.currency,

          status:
            "pending",

          subscription_months:
            claim.duration_months,

          auto_renew_requested:
            true,

          source:
            "auto_renew",
        })
        .select("id")
        .single();

      if (
        orderError ||
        !order
      ) {
        throw new Error(
          orderError
            ?.message ??
            "Could not create renewal order"
        );
      }

      orderId =
        order.id;

      const response =
        await createRecurringPayment(
          {
            orderId:
              order.id,

            amount:
              Number(
                claim.amount
              ),

            currency:
              claim.currency,

            description:
              `${claim.duration_months} month subscription renewal`,

            token:
              claim.token,

            tokenTranRef:
              claim.token_tran_ref,
          }
        );

      const tranRef =
        typeof response
          ?.tran_ref ===
        "string"
          ? response.tran_ref
          : null;

      if (!tranRef) {
        throw new Error(
          "PayTabs did not return tran_ref"
        );
      }

      const fulfillment =
        await fulfillPaymentByTranRef(
          tranRef
        );

      if (
        !fulfillment.paid
      ) {
        throw new Error(
          "Recurring payment was not approved"
        );
      }

      successful++;
    } catch {
      failed++;

      if (orderId) {
        await admin
          .from("orders")
          .update({
            status:
              "failed",
          })
          .eq(
            "id",
            orderId
          )
          .eq(
            "status",
            "pending"
          );
      }

      await admin.rpc(
        "record_subscription_renewal_failure",
        {
          p_subscription_id:
            claim.subscription_id,
        }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    processed:
      claims.length,
    successful,
    failed,
  });
}
