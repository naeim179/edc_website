"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPaymentPage } from "@/lib/paytabs";

const SITE_URL =
  process.env.SITE_URL ?? "http://localhost:3000";

function calculateFinalPrice(
  price: number | null,
  discountType: string | null,
  discountValue: number | null
) {
  const originalPrice = Math.max(0, Number(price ?? 0));
  const value = Math.max(0, Number(discountValue ?? 0));

  let finalPrice = originalPrice;

  if (discountType === "percentage") {
    finalPrice =
      originalPrice -
      (originalPrice * value) / 100;
  }

  if (discountType === "fixed") {
    finalPrice =
      originalPrice - value;
  }

  finalPrice = Math.max(0, finalPrice);

  return Math.round(finalPrice * 100) / 100;
}

export async function createOrder(
  courseId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: course, error: courseError } =
    await supabase
      .from("courses")
      .select(`
        id,
        title,
        price,
        currency,
        is_free,
        discount_type,
        discount_value
      `)
      .eq("id", courseId)
      .maybeSingle();

  if (courseError || !course) {
    throw new Error("Course not found");
  }

  const finalPrice = calculateFinalPrice(
    course.price,
    course.discount_type,
    course.discount_value
  );

  /*
   * Free course OR course that becomes free
   * after discount.
   */
  if (course.is_free || finalPrice === 0) {
    await createEnrollment(courseId, user.id);

    revalidatePath("/my-courses");

    redirect(`/courses/${courseId}`);
  }

  const { data: existingEnrollment } =
    await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

  if (existingEnrollment) {
    redirect(`/courses/${courseId}`);
  }

  /*
   * If there is already a pending order,
   * keep its original amount.
   */
  const { data: existingPendingOrder } =
    await supabase
      .from("orders")
      .select("id, amount, currency")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "pending")
      .maybeSingle();

  if (existingPendingOrder) {
    const paymentUrl = await createPaymentPage({
      orderId: existingPendingOrder.id,
      amount: Number(existingPendingOrder.amount),
      currency: existingPendingOrder.currency,
      description: course.title,
      customerEmail: user.email ?? "",
      customerName:
        user.email?.split("@")[0] ?? "Student",
      siteUrl: SITE_URL,
    });

    redirect(paymentUrl);
  }

  /*
   * Store the discounted price in the order.
   */
  const { data: newOrder, error } =
    await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: courseId,
        amount: finalPrice,
        currency: course.currency,
        status: "pending",
      })
      .select("id")
      .single();

  if (error || !newOrder) {
    if (
      error?.message.includes(
        "unique_pending_order_per_user_course"
      ) ||
      error?.message.includes("duplicate")
    ) {
      redirect(`/courses/${courseId}`);
    }

    throw new Error(
      error?.message ?? "تعذر إنشاء الطلب"
    );
  }

  const paymentUrl = await createPaymentPage({
    orderId: newOrder.id,
    amount: finalPrice,
    currency: course.currency,
    description: course.title,
    customerEmail: user.email ?? "",
    customerName:
      user.email?.split("@")[0] ?? "Student",
    siteUrl: SITE_URL,
  });

  redirect(paymentUrl);
}

async function createEnrollment(
  courseId: string,
  userId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .insert({
      course_id: courseId,
      student_id: userId,
    });

  if (
    error &&
    !error.message.includes("duplicate")
  ) {
    throw new Error(error.message);
  }
}
