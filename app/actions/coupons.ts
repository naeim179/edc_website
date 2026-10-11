"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFinalPrice } from "@/lib/free-enrollment";

export type CouponValidationResult = {
  valid: boolean;
  message: string;
  messageAr: string;
  messageEn: string;
  couponType:
    | "free_subscription"
    | "discount"
    | null;
  subscriptionMonths:
    number | null;
  discountType:
    | "percentage"
    | "fixed"
    | null;
  discountValue:
    number | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount:
    number | null;
};

function invalidResult(
  ar: string,
  en: string
): CouponValidationResult {
  return {
    valid: false,
    message: ar,
    messageAr: ar,
    messageEn: en,
    couponType: null,
    subscriptionMonths:
      null,
    discountType: null,
    discountValue: null,
    originalAmount: 0,
    discountAmount: 0,
    finalAmount: null,
  };
}

function couponErrorResult(
  message:
    string | undefined
): CouponValidationResult {
  const value =
    message ?? "";

  if (
    value.includes(
      "COUPON_ALREADY_USED"
    )
  ) {
    return invalidResult(
      "لقد استخدمت هذا الكوبون مسبقاً.",
      "You have already used this coupon."
    );
  }

  if (
    value.includes(
      "COUPON_EXHAUSTED"
    )
  ) {
    return invalidResult(
      "تم استخدام هذا الكوبون بالكامل.",
      "This coupon has reached its usage limit."
    );
  }

  if (
    value.includes(
      "COUPON_EXPIRED"
    )
  ) {
    return invalidResult(
      "انتهت صلاحية هذا الكوبون.",
      "This coupon has expired."
    );
  }

  if (
    value.includes(
      "COUPON_NOT_STARTED"
    )
  ) {
    return invalidResult(
      "هذا الكوبون لم يبدأ بعد.",
      "This coupon is not active yet."
    );
  }

  if (
    value.includes(
      "COUPON_INACTIVE"
    )
  ) {
    return invalidResult(
      "هذا الكوبون معطّل حالياً.",
      "This coupon is currently disabled."
    );
  }

  if (
    value.includes(
      "COUPON_NO_PAYABLE_AMOUNT"
    )
  ) {
    return invalidResult(
      "لا يمكن تطبيق كوبون خصم على طلب مجاني.",
      "A discount coupon cannot be applied to a free order."
    );
  }

  if (
    value.includes(
      "COUPON_DISCOUNT_TO_ZERO"
    )
  ) {
    return invalidResult(
      "هذا الخصم يجعل الطلب مجانياً. استخدم كوبون اشتراك مجاني بدلاً منه.",
      "This discount would make the order free. Use a free subscription coupon instead."
    );
  }

  return invalidResult(
    "الكوبون غير صالح لهذه الدورة.",
    "This coupon is not valid for this course."
  );
}

export async function validateCoupon(
  courseId: string,
  couponCode: string,
  subscriptionMonths:
    1 | 3 = 1
): Promise<CouponValidationResult> {
  const code =
    couponCode
      .trim()
      .toUpperCase();

  if (!code) {
    return invalidResult(
      "أدخل كود الكوبون.",
      "Enter a coupon code."
    );
  }

  if (
    subscriptionMonths !==
      1 &&
    subscriptionMonths !==
      3
  ) {
    return invalidResult(
      "مدة الاشتراك غير صالحة.",
      "Invalid subscription duration."
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
    return invalidResult(
      "سجّل الدخول أولاً لاستخدام الكوبون.",
      "Sign in first to use a coupon."
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
        price,
        is_free,
        discount_type,
        discount_value
      `)
      .eq(
        "id",
        courseId
      )
      .maybeSingle();

  if (
    courseError ||
    !course
  ) {
    return invalidResult(
      "الدورة غير موجودة.",
      "Course not found."
    );
  }

  const monthlyPrice =
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

  const originalAmount =
    Number(
      (
        monthlyPrice *
        subscriptionMonths
      ).toFixed(2)
    );

  const {
    data,
    error,
  } =
    await admin.rpc(
      "preview_course_coupon",
      {
        p_code:
          code,
        p_user_id:
          user.id,
        p_course_id:
          courseId,
        p_original_amount:
          originalAmount,
      }
    );

  if (error) {
    return couponErrorResult(
      error.message
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!row) {
    return invalidResult(
      "الكوبون غير صالح.",
      "Invalid coupon."
    );
  }

  const couponType =
    row.coupon_type as
      | "free_subscription"
      | "discount";

  const months =
    row.subscription_months ==
    null
      ? null
      : Number(
          row.subscription_months
        );

  const discountType =
    row.discount_type ==
    null
      ? null
      : (
          row.discount_type as
            | "percentage"
            | "fixed"
        );

  const discountValue =
    row.discount_value ==
    null
      ? null
      : Number(
          row.discount_value
        );

  const discountAmount =
    Number(
      row.discount_amount ??
        0
    );

  const finalAmount =
    Number(
      row.final_amount ??
        0
    );

  if (
    couponType ===
    "free_subscription"
  ) {
    const ar =
      `كوبون صالح: اشتراك مجاني لمدة ${months} شهر.`;

    const en =
      `Valid coupon: ${months} month${months === 1 ? "" : "s"} free subscription.`;

    return {
      valid: true,
      message: ar,
      messageAr: ar,
      messageEn: en,
      couponType,
      subscriptionMonths:
        months,
      discountType: null,
      discountValue: null,
      originalAmount,
      discountAmount:
        originalAmount,
      finalAmount: 0,
    };
  }

  const benefit =
    discountType ===
    "percentage"
      ? `${discountValue}%`
      : `${Number(
          discountValue ??
            0
        ).toFixed(2)} USD`;

  const ar =
    `تم تطبيق خصم ${benefit}. السعر بعد الخصم ${finalAmount.toFixed(2)} USD.`;

  const en =
    `${benefit} discount applied. New total: ${finalAmount.toFixed(2)} USD.`;

  return {
    valid: true,
    message: ar,
    messageAr: ar,
    messageEn: en,
    couponType,
    subscriptionMonths:
      null,
    discountType,
    discountValue,
    originalAmount,
    discountAmount,
    finalAmount,
  };
}
