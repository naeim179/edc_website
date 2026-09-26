import { createAdminClient } from "@/lib/supabase/admin";
import { queryTransaction } from "@/lib/paytabs";

export async function fulfillPaymentByTranRef(
  tranRef: string,
  callbackToken?: string | null
) {
  const result =
    await queryTransaction(
      tranRef
    );

  const responseStatus =
    result?.payment_result
      ?.response_status as
      | string
      | undefined;

  const orderId =
    result?.cart_id as
      | string
      | undefined;

  if (!orderId) {
    return {
      paid: false as const,
      courseId: null as string | null,
      expiresAt: null as string | null,
      autoRenew: false,
    };
  }

  const supabase =
    createAdminClient();

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      course_id,
      status,
      amount,
      currency,
      subscription_months,
      auto_renew_requested,
      fulfilled_at
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (
    orderError ||
    !order
  ) {
    return {
      paid: false as const,
      courseId: null as string | null,
      expiresAt: null as string | null,
      autoRenew: false,
    };
  }

  if (
    responseStatus === "P" ||
    responseStatus === "H"
  ) {
    if (
      order.status !== "paid" &&
      order.status !== "pending"
    ) {
      const {
        error,
      } = await supabase
        .from("orders")
        .update({
          status: "pending",
        })
        .eq("id", order.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    }

    return {
      paid: false as const,
      courseId: null as string | null,
      expiresAt: null as string | null,
      autoRenew: false,
    };
  }

  if (
    responseStatus !== "A"
  ) {
    if (
      responseStatus &&
      order.status !== "paid"
    ) {
      const {
        error,
      } = await supabase
        .from("orders")
        .update({
          status: "failed",
          paytabs_tran_ref:
            tranRef,
        })
        .eq("id", order.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    }

    return {
      paid: false as const,
      courseId: null as string | null,
      expiresAt: null as string | null,
      autoRenew: false,
    };
  }

  const paytabsAmount =
    Number(
      result?.cart_amount
    );

  const orderAmount =
    Number(order.amount);

  const paytabsCurrency =
    typeof result?.cart_currency ===
    "string"
      ? result.cart_currency
          .toUpperCase()
      : "";

  const orderCurrency =
    typeof order.currency ===
    "string"
      ? order.currency
          .toUpperCase()
      : "";

  const amountMatches =
    Number.isFinite(
      paytabsAmount
    ) &&
    Number.isFinite(
      orderAmount
    ) &&
    Math.abs(
      paytabsAmount -
        orderAmount
    ) < 0.001;

  const currencyMatches =
    paytabsCurrency !== "" &&
    paytabsCurrency ===
      orderCurrency;

  if (
    !amountMatches ||
    !currencyMatches
  ) {
    if (
      order.status !== "paid"
    ) {
      const {
        error,
      } = await supabase
        .from("orders")
        .update({
          status: "failed",
          paytabs_tran_ref:
            tranRef,
        })
        .eq("id", order.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    }

    return {
      paid: false as const,
      courseId: null as string | null,
      expiresAt: null as string | null,
      autoRenew: false,
    };
  }

  const queryToken =
    typeof result?.token ===
    "string"
      ? result.token
      : null;

  const token =
    callbackToken ||
    queryToken ||
    null;

  const {
    data: fulfillment,
    error: fulfillmentError,
  } = await supabase.rpc(
    "fulfill_subscription_order",
    {
      p_order_id: order.id,
      p_tran_ref: tranRef,
      p_token: token,
    }
  );

  if (fulfillmentError) {
    throw new Error(
      fulfillmentError.message
    );
  }

  /*
   * callback and return page can race.
   * If return fulfilled first without a token,
   * callback can safely attach the verified token later.
   */
  if (
    order.auto_renew_requested &&
    token
  ) {
    const {
      data: subscription,
    } = await supabase
      .from("subscriptions")
      .select("id")
      .eq(
        "student_id",
        order.user_id
      )
      .eq(
        "course_id",
        order.course_id
      )
      .maybeSingle();

    if (subscription) {
      const {
        error: tokenError,
      } = await supabase
        .from(
          "subscription_payment_tokens"
        )
        .upsert(
          {
            subscription_id:
              subscription.id,
            token,
            token_tran_ref:
              tranRef,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "subscription_id",
          }
        );

      if (tokenError) {
        throw new Error(
          tokenError.message
        );
      }

      const {
        error: autoRenewError,
      } = await supabase
        .from("subscriptions")
        .update({
          auto_renew: true,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          subscription.id
        );

      if (autoRenewError) {
        throw new Error(
          autoRenewError.message
        );
      }
    }
  }

  const row =
    Array.isArray(
      fulfillment
    )
      ? fulfillment[0]
      : fulfillment;

  // Create chat conversation after successful payment
  const { data: instructor } =
    await supabase
      .from("course_instructors")
      .select("teacher_id")
      .eq("course_id", order.course_id)
      .limit(1)
      .maybeSingle();

  if (instructor?.teacher_id) {
    const { error: conversationError } =
      await supabase.rpc(
        "start_conversation",
        {
          p_course_id: order.course_id,
          p_teacher_id: instructor.teacher_id,
        }
      );

    if (conversationError) {
      console.error(
        "Create conversation failed:",
        conversationError.message
      );
    }
  }

  return {
    paid: true as const,
    courseId:
      order.course_id as string,

    expiresAt:
      row?.subscription_expires_at ??
      null,

    autoRenew:
      Boolean(
        row?.subscription_auto_renew
      ) ||
      Boolean(
        order.auto_renew_requested &&
          token
      ),
  };
}
