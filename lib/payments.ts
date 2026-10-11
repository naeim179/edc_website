import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  queryTransaction,
} from "@/lib/paytabs";

function unpaidResult() {
  return {
    paid:
      false as const,
    courseId:
      null as string | null,
    expiresAt:
      null as string | null,
    autoRenew:
      false,
  };
}

async function cancelPrivateBooking(
  bookingId:
    | string
    | null
) {
  if (!bookingId) {
    return;
  }

  const admin =
    createAdminClient();

  await admin
    .from(
      "private_course_bookings"
    )
    .update({
      status:
        "cancelled",
      cancelled_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      bookingId
    )
    .eq(
      "status",
      "pending_payment"
    );
}

async function confirmPrivateBooking(
  bookingId:
    | string
    | null,
  userId: string,
  courseId: string
) {
  if (!bookingId) {
    return;
  }

  const admin =
    createAdminClient();

  const {
    data:
      currentBooking,
    error:
      currentError,
  } = await admin
    .from(
      "private_course_bookings"
    )
    .select(`
      id,
      status,
      student_id,
      course_id
    `)
    .eq(
      "id",
      bookingId
    )
    .maybeSingle();

  if (
    currentError ||
    !currentBooking
  ) {
    throw new Error(
      currentError?.message ??
        "Private booking not found"
    );
  }

  if (
    currentBooking.student_id !==
      userId ||
    currentBooking.course_id !==
      courseId
  ) {
    throw new Error(
      "Private booking mismatch"
    );
  }

  if (
    currentBooking.status ===
    "confirmed"
  ) {
    return;
  }

  if (
    currentBooking.status !==
    "pending_payment"
  ) {
    throw new Error(
      "Private booking is no longer available"
    );
  }

  const {
    error:
      updateError,
  } = await admin
    .from(
      "private_course_bookings"
    )
    .update({
      status:
        "confirmed",
      confirmed_at:
        new Date()
          .toISOString(),
      hold_expires_at:
        null,
    })
    .eq(
      "id",
      bookingId
    )
    .eq(
      "status",
      "pending_payment"
    );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }
}

export async function fulfillPaymentByTranRef(
  tranRef: string,
  callbackToken?:
    | string
    | null
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
    return unpaidResult();
  }

  const supabase =
    createAdminClient();

  const {
    data: order,
    error:
      orderError,
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
      fulfilled_at,
      private_booking_id
    `)
    .eq(
      "id",
      orderId
    )
    .maybeSingle();

  if (
    orderError ||
    !order
  ) {
    return unpaidResult();
  }

  if (
    responseStatus ===
      "P" ||
    responseStatus ===
      "H"
  ) {
    if (
      order.status !==
        "paid" &&
      order.status !==
        "pending"
    ) {
      await supabase
        .from("orders")
        .update({
          status:
            "pending",
        })
        .eq(
          "id",
          order.id
        );
    }

    return unpaidResult();
  }

  if (
    responseStatus !==
    "A"
  ) {
    if (
      responseStatus &&
      order.status !==
        "paid"
    ) {
      const {
        error:
          failError,
      } = await supabase
        .from("orders")
        .update({
          status:
            "failed",
          paytabs_tran_ref:
            tranRef,
        })
        .eq(
          "id",
          order.id
        );

      if (failError) {
        throw new Error(
          failError.message
        );
      }

      await cancelPrivateBooking(
        order.private_booking_id ??
          null
      );
    }

    return unpaidResult();
  }

  const paytabsAmount =
    Number(
      result?.cart_amount
    );

  const orderAmount =
    Number(
      order.amount
    );

  const paytabsCurrency =
    typeof result?.cart_currency ===
    "string"
      ? result.cart_currency.toUpperCase()
      : "";

  const orderCurrency =
    typeof order.currency ===
    "string"
      ? order.currency.toUpperCase()
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
    paytabsCurrency !==
      "" &&
    paytabsCurrency ===
      orderCurrency;

  if (
    !amountMatches ||
    !currencyMatches
  ) {
    if (
      order.status !==
      "paid"
    ) {
      const {
        error:
          failError,
      } = await supabase
        .from("orders")
        .update({
          status:
            "failed",
          paytabs_tran_ref:
            tranRef,
        })
        .eq(
          "id",
          order.id
        );

      if (failError) {
        throw new Error(
          failError.message
        );
      }

      await cancelPrivateBooking(
        order.private_booking_id ??
          null
      );
    }

    return unpaidResult();
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
    data:
      fulfillment,
    error:
      fulfillmentError,
  } = await supabase.rpc(
    "fulfill_subscription_order",
    {
      p_order_id:
        order.id,
      p_tran_ref:
        tranRef,
      p_token:
        token,
    }
  );

  if (
    fulfillmentError
  ) {
    throw new Error(
      fulfillmentError.message
    );
  }

  await confirmPrivateBooking(
    order.private_booking_id ??
      null,
    order.user_id,
    order.course_id
  );

  if (
    order.auto_renew_requested &&
    token
  ) {
    const {
      data:
        subscription,
    } = await supabase
      .from(
        "subscriptions"
      )
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
        error:
          tokenError,
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
        error:
          autoRenewError,
      } = await supabase
        .from(
          "subscriptions"
        )
        .update({
          auto_renew:
            true,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          subscription.id
        );

      if (
        autoRenewError
      ) {
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

  return {
    paid:
      true as const,

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
