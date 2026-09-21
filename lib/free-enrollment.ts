import { createAdminClient } from "@/lib/supabase/admin";

export function calculateFinalPrice(
  price: number,
  discountType: string | null,
  discountValue: number
) {
  if (!discountType || discountValue <= 0) {
    return price;
  }

  if (discountType === "percentage") {
    return Math.max(
      0,
      Number((price - (price * discountValue) / 100).toFixed(2))
    );
  }

  if (discountType === "fixed") {
    return Math.max(0, Number((price - discountValue).toFixed(2)));
  }

  return price;
}

// التسجيل بالدورات المجانية بيتم من السيرفر فقط، بعد فحص الدور والنشر والسعر
export async function enrollInFreeCourse(userId: string, courseId: string) {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || (profile.role !== "student" && profile.role !== "admin")) {
    throw new Error("هذا الحساب غير مخوّل بالتسجيل بالدورات");
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, price, is_free, is_published, discount_type, discount_value")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course || !course.is_published) {
    throw new Error("الدورة غير متاحة");
  }

  const finalPrice = calculateFinalPrice(
    Number(course.price ?? 0),
    course.discount_type,
    Number(course.discount_value ?? 0)
  );

  if (!course.is_free && finalPrice > 0) {
    throw new Error("هذه الدورة مدفوعة ولا يمكن التسجيل فيها مباشرة");
  }

  const { error: insertError } = await admin.from("enrollments").insert({
    student_id: userId,
    course_id: courseId,
  });

  if (
    insertError &&
    insertError.code !== "23505" &&
    !insertError.message.includes("duplicate")
  ) {
    throw new Error(insertError.message);
  }
}
