"use server";

import { createClient } from "@/lib/supabase/server";


export async function validateCoupon(
  courseId: string,
  couponCode: string
) {
  const code =
    couponCode
      .trim()
      .toUpperCase();


  if (!code) {
    return {
      valid: false,
      message: "أدخل كود الكوبون",
    };
  }


  const supabase =
    await createClient();


  const {
    data: coupon,
    error,
  } = await supabase
    .from("course_coupons")
    .select(`
      id,
      code
    `)
    .eq("code", code)
    .eq("course_id", courseId)
    .eq("is_active", true)
    .eq("is_used", false)
    .maybeSingle();


  if (error) {
    throw new Error(error.message);
  }


  if (!coupon) {
    return {
      valid: false,
      message:
        "الكوبون غير صالح أو مستخدم مسبقاً",
    };
  }


  return {
    valid: true,
    message:
      "تم تفعيل الكوبون بنجاح",
  };
}
