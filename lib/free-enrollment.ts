import {
  createAdminClient,
} from "@/lib/supabase/admin";

export function calculateFinalPrice(
  price: number,
  discountType:
    | string
    | null,
  discountValue: number
) {
  if (
    !discountType ||
    discountValue <= 0
  ) {
    return price;
  }

  if (
    discountType ===
    "percentage"
  ) {
    return Math.max(
      0,
      Number(
        (
          price -
          (
            price *
            discountValue
          ) /
            100
        ).toFixed(2)
      )
    );
  }

  if (
    discountType ===
    "fixed"
  ) {
    return Math.max(
      0,
      Number(
        (
          price -
          discountValue
        ).toFixed(2)
      )
    );
  }

  return price;
}

export async function activateZeroPriceCourse(
  userId: string,
  courseId: string,
  subscriptionMonths: 1 | 3 | null = null,
  privateBookingId: string | null = null
) {
  const { error } = await createAdminClient().rpc("activate_zero_price_course", {
    p_user_id: userId,
    p_course_id: courseId,
    p_subscription_months: subscriptionMonths,
    p_private_booking_id: privateBookingId,
  });
  if (!error) return;

  const messages: Record<string, string> = {
    GROUP_CAPACITY_REACHED: "اكتمل عدد طلاب هذه الدورة الجماعية",
    ZERO_PRICE_ACCOUNT_NOT_ALLOWED: "هذا الحساب غير مخوّل بالتسجيل في الدورات",
    ZERO_PRICE_COURSE_UNAVAILABLE: "الدورة غير متاحة",
    ZERO_PRICE_REGISTRATION_CLOSED: "التسجيل مغلق حاليًا",
    ZERO_PRICE_REQUIRED: "تغيّر سعر الدورة. أعد فتح صفحة التسجيل",
    ZERO_PRICE_DURATION_REQUIRED: "اختر مدة الاشتراك من صفحة التسجيل",
    ZERO_PRICE_PENDING_PAYMENT: "لديك طلب دفع قائم لهذه الدورة. تحقّق من الطلب أولًا",
    ZERO_PRICE_BOOKING_REQUIRED: "يجب اختيار موعدَين قبل التسجيل في الدورة الخاصة",
    ZERO_PRICE_BOOKING_UNAVAILABLE: "الحجز غير متاح الآن. اختر الموعدَين من جديد",
    ZERO_PRICE_BOOKING_MISMATCH: "الحجز لا يتبع هذه الدورة",
  };
  if (error.code === "55P03") {
    throw new Error("هناك طلب آخر قيد المعالجة. جرّب مرة أخرى بعد قليل");
  }
  throw new Error(messages[error.message] ?? "تعذّر تفعيل الوصول إلى الدورة");
}
