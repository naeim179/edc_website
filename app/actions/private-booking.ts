"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reservePrivateSchedule(
  courseId: string,
  slotIds: string[]
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }

  if (
    !Array.isArray(slotIds) ||
    slotIds.length !== 2
  ) {
    throw new Error(
      "يجب اختيار موعدين بالضبط"
    );
  }

  const unique =
    [...new Set(slotIds)];

  if (
    unique.length !==
    slotIds.length
  ) {
    throw new Error(
      "لا يمكن اختيار نفس الموعد مرتين"
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "reserve_private_course",
    {
      p_course_id:
        courseId,
      p_slot_ids:
        unique,
    }
  );

  if (error) {
    const message =
      error.message ?? "";

    if (
      message.includes(
        "already booked"
      )
    ) {
      throw new Error(
        "هذه الدورة محجوزة بالفعل"
      );
    }

    if (
      message.includes(
        "temporarily held"
      )
    ) {
      throw new Error(
        "هذه الدورة قيد الحجز حالياً من طالب آخر"
      );
    }

    if (
      message.includes(
        "Registration is currently closed"
      )
    ) {
      throw new Error(
        "التسجيل في هذه الدورة مغلق حالياً"
      );
    }

    if (
      message.includes(
        "Exactly two appointments are required"
      ) ||
      message.includes(
        "Two different appointments are required"
      )
    ) {
      throw new Error(
        "يجب اختيار موعدين مختلفين بالضبط"
      );
    }

    console.error(
      "reserve_private_course failed:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    throw new Error(
      error.message ||
        "تعذر حجز المواعيد، حاول مرة أخرى"
    );
  }

  if (!data) {
    throw new Error(
      "تعذر إنشاء الحجز"
    );
  }

  return {
    bookingId:
      String(data),
  };
}

export async function releasePrivateSchedule(
  bookingId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }

  const admin = createAdminClient();

  const { data: booking, error: bookingError } = await admin
    .from("private_course_bookings")
    .select("id,course_id,status")
    .eq("id", bookingId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (bookingError || !booking) {
    throw new Error("Booking not found");
  }

  let closedByGateway = false;

  if (booking.status === "pending_payment") {
    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id,status,payment_method,source")
      .eq("private_booking_id", booking.id)
      .limit(20);

    if (ordersError) throw new Error("Could not verify booking orders");

    if (orders?.some(o => o.status === "paid")) {
      return { success: false as const };
    }

    const pendingOrders = (orders ?? []).filter(o => o.status === "pending");

    if (pendingOrders.length > 0) {
      const order = pendingOrders[0];

      if (
        pendingOrders.length !== 1 ||
        order.payment_method !== "paytabs" ||
        order.source !== "manual"
      ) {
        return { success: false as const };
      }

      const { data: attempt, error: attemptError } = await admin
        .from("paytabs_payment_attempts")
        .select("id,status,created_at,payment_url,tran_ref")
        .eq("order_id", order.id)
        .maybeSingle();

      if (attemptError) throw new Error("Could not verify payment attempt");

      const age = attempt
        ? Date.now() - new Date(attempt.created_at).getTime()
        : NaN;

      if (
        !attempt ||
        attempt.status !== "initiated" ||
        !attempt.payment_url ||
        attempt.tran_ref ||
        !Number.isFinite(age) ||
        age < 5 * 60 * 1000
      ) {
        return { success: false as const };
      }

      const profileId = Number(process.env.PAYTABS_PROFILE_ID);
      const serverKey = process.env.PAYTABS_SERVER_KEY;

      if (!Number.isInteger(profileId) || profileId <= 0 || !serverKey) {
        throw new Error("Payment gateway configuration unavailable");
      }

      const base = (
        process.env.PAYTABS_BASE_URL ||
        "https://secure-jordan.paytabs.com"
      ).replace(/\/+$/, "");

      let response: Response;
      try {
        response = await fetch(base + "/payment/query", {
          method: "POST",
          headers: {
            Authorization: serverKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile_id: profileId,
            cart_id: attempt.id,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        return { success: false as const };
      }

      if (!response.ok) return { success: false as const };

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return { success: false as const };
      }

      const data = body && typeof body === "object"
        ? body as Record<string, unknown>
        : {};

      const transactions = Array.isArray(body)
        ? body
        : Array.isArray(data.transactions)
          ? data.transactions
          : typeof data.tran_ref === "string"
            ? [data]
            : [];

      const verifiedCancelled =
        transactions.length > 0 &&
        transactions.every((value: unknown) => {
          if (!value || typeof value !== "object") return false;
          const t = value as Record<string, unknown>;
          const result = t.payment_result as
            Record<string, unknown> | null | undefined;

          return (
            t.cart_id === attempt.id &&
            typeof t.tran_ref === "string" &&
            t.tran_ref.length > 0 &&
            result?.response_status === "C"
          );
        });

      if (!verifiedCancelled) return { success: false as const };

      const { data: closed, error: closeError } = await admin.rpc(
        "close_verified_cancelled_paytabs_order",
        {
          p_order_id: order.id,
          p_attempt_id: attempt.id,
        }
      );

      if (closeError) throw new Error("Could not reconcile cancelled payment");
      if (closed !== true) return { success: false as const };

      closedByGateway = true;
    }
  }

  if (!closedByGateway && booking.status === "pending_payment") {
    const { error } = await supabase.rpc(
      "release_private_course_hold",
      { p_booking_id: bookingId }
    );

    if (error) throw new Error("Could not release booking");
  }

  if (booking?.course_id) {
    revalidatePath(
      `/courses/${booking.course_id}`
    );

    revalidatePath(
      `/courses/${booking.course_id}/schedule`
    );

    revalidatePath(
      `/checkout/${booking.course_id}`
    );
  }

  revalidatePath(
    "/courses"
  );

  return {
    success: true,
  };
}
