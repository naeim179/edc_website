"use server";

import {
  redirect,
} from "next/navigation";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createPaymentPage,
} from "@/lib/paytabs";

import {
  calculateFinalPrice,
} from "@/lib/free-enrollment";

const SITE_URL =
  process.env.SITE_URL ??
  "http://localhost:3000";

type SubscriptionMonths =
  | 1
  | 3;

type PaymentMethod =
  | "paytabs"
  | "paypal"
  | "cliq";

async function confirmPrivateBooking(
  bookingId: string,
  userId: string,
  courseId: string
) {
  const admin =
    createAdminClient();

  const {
    data: booking,
    error,
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
      "student_id",
      userId
    )
    .eq(
      "course_id",
      courseId
    )
    .eq(
      "status",
      "pending_payment"
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!booking) {
    const {
      data:
        existing,
    } = await admin
      .from(
        "private_course_bookings"
      )
      .select(
        "id,status"
      )
      .eq(
        "id",
        bookingId
      )
      .eq(
        "student_id",
        userId
      )
      .eq(
        "course_id",
        courseId
      )
      .maybeSingle();

    if (
      existing?.status !==
      "confirmed"
    ) {
      throw new Error(
        "تعذر تثبيت حجز الدورة"
      );
    }
  }
}

function couponCheckoutError(
  message:
    string | undefined
) {
  const value =
    message ?? "";

  if (
    value.includes(
      "COUPON_ALREADY_USED"
    )
  ) {
    return "لقد استخدمت هذا الكوبون مسبقاً";
  }

  if (
    value.includes(
      "COUPON_EXHAUSTED"
    )
  ) {
    return "تم استخدام هذا الكوبون بالكامل";
  }

  if (
    value.includes(
      "COUPON_EXPIRED"
    )
  ) {
    return "انتهت صلاحية هذا الكوبون";
  }

  if (
    value.includes(
      "COUPON_NOT_STARTED"
    )
  ) {
    return "هذا الكوبون لم يبدأ بعد";
  }

  if (
    value.includes(
      "COUPON_INACTIVE"
    )
  ) {
    return "هذا الكوبون معطّل حالياً";
  }

  if (
    value.includes(
      "COUPON_NO_PAYABLE_AMOUNT"
    )
  ) {
    return "لا يمكن تطبيق كوبون خصم على طلب مجاني";
  }

  if (
    value.includes(
      "COUPON_DISCOUNT_TO_ZERO"
    )
  ) {
    return "هذا الخصم يجعل الطلب مجانياً، استخدم كوبون اشتراك مجاني";
  }

  if (
    value.includes(
      "SUBSCRIPTION_ALREADY_UNLIMITED"
    )
  ) {
    return "اشتراكك الحالي في هذه الدورة غير محدود ولا يحتاج إلى تمديد";
  }

  return "الكوبون غير صالح لهذه الدورة";
}

export async function createOrder(
  courseId: string,
  subscriptionMonths:
    SubscriptionMonths = 1,
  autoRenew = false,
  paymentMethod:
    PaymentMethod =
      "paytabs",
  couponCode?: string,
  privateBookingId?: string
) {
  if (
    subscriptionMonths !==
      1 &&
    subscriptionMonths !==
      3
  ) {
    throw new Error(
      "مدة الاشتراك غير صالحة"
    );
  }

  if (
    paymentMethod !==
      "paytabs" &&
    paymentMethod !==
      "cliq"
  ) {
    throw new Error(
      "طريقة الدفع غير متاحة حالياً"
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: course,
    error:
      courseError,
  } =
    await admin
      .from("courses")
      .select(`
        id,
        title,
        price,
        is_free,
        is_published,
        discount_type,
        discount_value,
        course_type,
        registration_open
      `)
      .eq(
        "id",
        courseId
      )
      .maybeSingle();

  if (
    courseError ||
    !course ||
    !course.is_published
  ) {
    throw new Error(
      "الدورة غير متاحة"
    );
  }

  const {
    data:
      existingEnrollment,
  } =
    await admin
      .from(
        "enrollments"
      )
      .select("id")
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "course_id",
        courseId
      )
      .maybeSingle();

  const isRenewal =
    Boolean(
      existingEnrollment
    );

  if (
    !isRenewal &&
    !course.registration_open
  ) {
    throw new Error(
      "التسجيل في هذه الدورة مغلق حالياً"
    );
  }

  let validatedBookingId:
    string | null =
    null;

  if (
    course.course_type ===
      "private" &&
    !isRenewal
  ) {
    if (
      !privateBookingId
    ) {
      throw new Error(
        "اختر مواعيد الـPrivate أولاً"
      );
    }

    if (
      paymentMethod ===
      "cliq"
    ) {
      throw new Error(
        "الدفع عبر CliQ غير متاح حالياً لحجوزات Private"
      );
    }

    const {
      data: booking,
      error:
        bookingError,
    } =
      await admin
        .from(
          "private_course_bookings"
        )
        .select(`
          id,
          status,
          hold_expires_at
        `)
        .eq(
          "id",
          privateBookingId
        )
        .eq(
          "course_id",
          courseId
        )
        .eq(
          "student_id",
          user.id
        )
        .maybeSingle();

    if (
      bookingError ||
      !booking ||
      booking.status !==
        "pending_payment" ||
      !booking.hold_expires_at ||
      new Date(
        booking.hold_expires_at
      ).getTime() <=
        Date.now()
    ) {
      throw new Error(
        "انتهت مدة حجز المواعيد، اختر المواعيد من جديد"
      );
    }

    const {
      count:
        selectedCount,
      error:
        slotsError,
    } =
      await admin
        .from(
          "private_booking_slots"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head: true,
          }
        )
        .eq(
          "booking_id",
          booking.id
        );

    if (
      slotsError ||
      selectedCount !== 2
    ) {
      throw new Error(
        "يجب اختيار موعدين بالضبط"
      );
    }

    validatedBookingId =
      booking.id;
  }

  const monthlyPriceUsd =
    calculateFinalPrice(
      Number(
        course.price ??
          0
      ),
      course.discount_type,
      Number(
        course.discount_value ??
          0
      )
    );

  const originalTotalUsd =
    Number(
      (
        monthlyPriceUsd *
        subscriptionMonths
      ).toFixed(2)
    );

  // Never reprice or replace a pending order that may already have a
  // live PayTabs checkout (including legacy checkouts from before migration).
  const { data: existingPending, error: pendingError } = await admin
    .from("orders")
    .select("id,payment_method,source")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingError) throw new Error(pendingError.message);
  if (existingPending) {
    // Re-open the original CliQ upload page without repricing or creating a new order.
    if (paymentMethod === "cliq" && existingPending.payment_method === "cliq" &&
        existingPending.source === "manual") {
      redirect(`/checkout/success?order=${existingPending.id}&method=cliq`);
    }
    const { data: priorAttempt, error: priorError } = await admin
      .from("paytabs_payment_attempts")
      .select("payment_url,status")
      .eq("order_id", existingPending.id)
      .maybeSingle();
    if (priorError) throw new Error(priorError.message);
    if (paymentMethod === "paytabs" && priorAttempt?.payment_url &&
        priorAttempt.status !== "requires_review") {
      redirect(priorAttempt.payment_url);
    }
    throw new Error(
      "هناك عملية دفع سابقة لهذه الدورة لم تُحسم بعد. لا تبدأ دفعة جديدة؛ تواصل مع الدعم للتحقق منها."
    );
  }

  let normalizedCouponCode:
    string | null =
    null;

  let discountCouponCode:
    string | null =
    null;

  let effectiveAutoRenew =
    autoRenew;

  if (couponCode) {
    normalizedCouponCode =
      couponCode
        .trim()
        .toUpperCase();

    const {
      data:
        previewData,
      error:
        previewError,
    } =
      await admin.rpc(
        "preview_course_coupon",
        {
          p_code:
            normalizedCouponCode,
          p_user_id:
            user.id,
          p_course_id:
            courseId,
          p_original_amount:
            originalTotalUsd,
        }
      );

    if (
      previewError
    ) {
      throw new Error(
        couponCheckoutError(
          previewError.message
        )
      );
    }

    const preview =
      Array.isArray(
        previewData
      )
        ? previewData[0]
        : previewData;

    if (!preview) {
      throw new Error(
        "الكوبون غير صالح"
      );
    }

    effectiveAutoRenew =
      false;

    if (
      preview.coupon_type ===
      "free_subscription"
    ) {
      const {
        error:
          redeemError,
      } =
        await admin.rpc(
          "redeem_free_course_coupon",
          {
            p_code:
              normalizedCouponCode,
            p_user_id:
              user.id,
            p_course_id:
              courseId,
            p_private_booking_id:
              validatedBookingId,
          }
        );

      if (
        redeemError
      ) {
        throw new Error(
          couponCheckoutError(
            redeemError.message
          )
        );
      }

      revalidatePath(
        "/my-courses"
      );

      revalidatePath(
        "/courses"
      );

      revalidatePath(
        `/courses/${courseId}`
      );

      revalidatePath(
        "/admin/coupons"
      );

      redirect(
        `/courses/${courseId}`
      );
    }

    if (
      preview.coupon_type !==
      "discount"
    ) {
      throw new Error(
        "نوع الكوبون غير صالح"
      );
    }

    discountCouponCode =
      normalizedCouponCode;
  }

  if (
    course.is_free ||
    monthlyPriceUsd ===
      0
  ) {
    const {
      error:
        enrollError,
    } =
      await admin
        .from(
          "enrollments"
        )
        .upsert(
          {
            student_id:
              user.id,
            course_id:
              courseId,
          },
          {
            onConflict:
              "student_id,course_id",
            ignoreDuplicates:
              true,
          }
        );

    if (
      enrollError
    ) {
      throw new Error(
        enrollError.message
      );
    }

    if (
      validatedBookingId
    ) {
      await confirmPrivateBooking(
        validatedBookingId,
        user.id,
        courseId
      );
    }

    revalidatePath(
      "/my-courses"
    );

    revalidatePath(
      `/courses/${courseId}`
    );

    redirect(
      `/courses/${courseId}`
    );
  }

  const description =
    `${course.title} - ${subscriptionMonths} month subscription`;

  const orderFields = {
    amount:
      originalTotalUsd,
    original_amount:
      originalTotalUsd,
    coupon_id:
      null,
    coupon_code:
      null,
    coupon_discount_amount:
      0,
    currency:
      "USD",
    subscription_months:
      subscriptionMonths,
    auto_renew_requested:
      effectiveAutoRenew,
    payment_method:
      paymentMethod,
    source:
      "manual",
    private_booking_id:
      validatedBookingId,
  };

  // A distinct new order is created only when no pending payment exists.
  // The partial unique index also rejects concurrent duplicate inserts.
  const { data: newOrder, error: orderError } = await admin
    .from("orders")
    .insert({ user_id: user.id, course_id: courseId, status: "pending", ...orderFields })
    .select("id")
    .single();
  if (orderError || !newOrder) {
    throw new Error(orderError?.message ?? "تعذر إنشاء الطلب");
  }
  const orderId = newOrder.id;

  const {
    error:
      clearCouponError,
  } =
    await admin.rpc(
      "clear_coupon_from_order",
      {
        p_order_id:
          orderId,
        p_user_id:
          user.id,
      }
    );

  if (
    clearCouponError
  ) {
    throw new Error(
      clearCouponError.message
    );
  }

  let chargedAmount =
    originalTotalUsd;
  let appliedDiscountCouponId: string | null = null;

  if (
    discountCouponCode
  ) {
    const {
      data:
        reservationData,
      error:
        reservationError,
    } =
      await admin.rpc(
        "reserve_discount_coupon_for_order",
        {
          p_code:
            discountCouponCode,
          p_user_id:
            user.id,
          p_course_id:
            courseId,
          p_order_id:
            orderId,
          p_original_amount:
            originalTotalUsd,
          p_reservation_minutes:
            paymentMethod ===
            "cliq"
              ? 4320
              : 120,
        }
      );

    if (
      reservationError
    ) {
      throw new Error(
        couponCheckoutError(
          reservationError.message
        )
      );
    }

    const reservation =
      Array.isArray(
        reservationData
      )
        ? reservationData[0]
        : reservationData;

    if (!reservation) {
      throw new Error(
        "تعذر حجز الكوبون"
      );
    }

    chargedAmount =
      Number(
        reservation.final_amount
      );
    appliedDiscountCouponId = String(reservation.coupon_id);
  }

  if (
    discountCouponCode &&
    chargedAmount <= 0
  ) {
    const {
      error:
        zeroFulfillmentError,
    } = await admin.rpc(
      "fulfill_zero_discount_order",
      {
        p_order_id:
          orderId,
        p_user_id:
          user.id,
      }
    );

    if (
      zeroFulfillmentError
    ) {
      throw new Error(
        couponCheckoutError(
          zeroFulfillmentError.message
        )
      );
    }

    revalidatePath(
      "/my-courses"
    );

    revalidatePath(
      "/courses"
    );

    revalidatePath(
      `/courses/${courseId}`
    );

    revalidatePath(
      "/admin/coupons"
    );

    redirect(
      `/courses/${courseId}`
    );
  }

  if (
    validatedBookingId
  ) {
    const {
      error:
        holdError,
    } =
      await admin
        .from(
          "private_course_bookings"
        )
        .update({
          hold_expires_at:
            new Date(
              Date.now() +
                30 *
                  60 *
                  1000
            ).toISOString(),
        })
        .eq(
          "id",
          validatedBookingId
        )
        .eq(
          "status",
          "pending_payment"
        );

    if (
      holdError
    ) {
      throw new Error(
        holdError.message
      );
    }
  }

  if (
    paymentMethod ===
    "cliq"
  ) {
    redirect(
      `/checkout/success?order=${orderId}&method=cliq`
    );
  }

  // Atomically reserve the immutable snapshot before contacting PayTabs.
  const { data: attemptId, error: attemptError } = await admin.rpc(
    "begin_paytabs_checkout_attempt",
    {
      p_order_id: orderId,
      p_user_id: user.id,
      p_amount: chargedAmount,
      p_currency: "USD",
      p_months: subscriptionMonths,
      p_coupon_id: appliedDiscountCouponId,
      p_booking_id: validatedBookingId,
      p_auto_renew: effectiveAutoRenew,
    }
  );
  if (attemptError || !attemptId) {
    throw new Error(attemptError?.message ?? "تعذر تثبيت محاولة الدفع");
  }

  let paymentUrl: string;
  try {
    paymentUrl = await createPaymentPage({
      orderId,
      cartId: String(attemptId),
      amount: chargedAmount,
      currency: "USD",
      description,
      customerEmail: user.email ?? "",
      customerName: user.email?.split("@")[0] ?? "Student",
      siteUrl: SITE_URL,
      tokenize: effectiveAutoRenew,
    });
  } catch {
    // Network failures can occur AFTER PayTabs accepted the request.
    // Never release the coupon, cancel Private or generate a second cart.
    await admin.from("paytabs_payment_attempts")
      .update({ status: "uncertain", updated_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("status", "created");
    throw new Error(
      "لم نتمكن من تأكيد إنشاء صفحة الدفع. لا تعِد الدفع الآن؛ تواصل مع الدعم للتحقق من العملية."
    );
  }

  const { data: saved, error: saveError } = await admin
    .from("paytabs_payment_attempts")
    .update({ payment_url: paymentUrl, status: "initiated", updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("status", "created")
    .select("id")
    .maybeSingle();
  if (saveError) throw new Error(saveError.message);
  // A fast signed callback might already have finalized this attempt.
  if (!saved) {
    const { data: existingAttempt } = await admin
      .from("paytabs_payment_attempts")
      .select("status")
      .eq("id", attemptId)
      .maybeSingle();
    if (existingAttempt?.status !== "approved") {
      throw new Error("تعذر تسجيل رابط الدفع؛ تواصل مع الدعم قبل المحاولة مرة أخرى.");
    }
  }

  redirect(
    paymentUrl
  );
}
