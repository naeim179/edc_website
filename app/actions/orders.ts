"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPaymentPage } from "@/lib/paytabs";

const SITE_URL =
  process.env.SITE_URL ?? "http://localhost:3000";

function calculateFinalPrice(
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
      Number(
        (price - (price * discountValue) / 100).toFixed(2)
      )
    );
  }

  if (discountType === "fixed") {
    return Math.max(
      0,
      Number((price - discountValue).toFixed(2))
    );
  }

  return price;
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

  const originalPrice = course.price ?? 0;

  const finalPrice = calculateFinalPrice(
    originalPrice,
    course.discount_type,
    course.discount_value ?? 0
  );

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

  const { data: existingPendingOrder } =
    await supabase
      .from("orders")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "pending")
      .maybeSingle();

  if (existingPendingOrder) {
    const { error: updateError } =
      await supabase
        .from("orders")
        .update({
          amount: finalPrice,
          currency: course.currency,
        })
        .eq("id", existingPendingOrder.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const paymentUrl = await createPaymentPage({
      orderId: existingPendingOrder.id,
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
