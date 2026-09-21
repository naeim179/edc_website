"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaymentPage } from "@/lib/paytabs";

import {
  calculateFinalPrice,
  enrollInFreeCourse,
} from "@/lib/free-enrollment";

const SITE_URL =
  process.env.SITE_URL ??
  "http://localhost:3000";

type SubscriptionMonths = 1 | 3;

export async function createOrder(
  courseId: string,
  subscriptionMonths: SubscriptionMonths = 1,
  autoRenew = false
) {
  if (
    subscriptionMonths !== 1 &&
    subscriptionMonths !== 3
  ) {
    throw new Error(
      "مدة الاشتراك غير صالحة"
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: course,
    error: courseError,
  } = await supabase
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
    throw new Error(
      "Course not found"
    );
  }

  const originalPrice =
    course.price ?? 0;

  const monthlyPrice =
    calculateFinalPrice(
      originalPrice,
      course.discount_type,
      course.discount_value ?? 0
    );

  if (
    course.is_free ||
    monthlyPrice === 0
  ) {
    await enrollInFreeCourse(
      user.id,
      courseId
    );

    revalidatePath("/my-courses");

    redirect(
      `/courses/${courseId}`
    );
  }

  const totalAmount = Number(
    (
      monthlyPrice *
      subscriptionMonths
    ).toFixed(2)
  );

  const admin =
    createAdminClient();

  const {
    data: existingPendingOrder,
  } = await admin
    .from("orders")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "pending")
    .maybeSingle();

  const description =
    `${course.title} - ${subscriptionMonths} month subscription`;

  if (existingPendingOrder) {
    const {
      error: updateError,
    } = await admin
      .from("orders")
      .update({
        amount: totalAmount,
        currency:
          course.currency ?? "JOD",
        subscription_months:
          subscriptionMonths,
        auto_renew_requested:
          autoRenew,
        source: "manual",
      })
      .eq(
        "id",
        existingPendingOrder.id
      )
      .eq("status", "pending");

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    const paymentUrl =
      await createPaymentPage({
        orderId:
          existingPendingOrder.id,
        amount: totalAmount,
        currency:
          course.currency ?? "JOD",
        description,
        customerEmail:
          user.email ?? "",
        customerName:
          user.email?.split("@")[0] ??
          "Student",
        siteUrl: SITE_URL,
        tokenize: autoRenew,
      });

    redirect(paymentUrl);
  }

  const {
    data: newOrder,
    error,
  } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      course_id: courseId,

      amount: totalAmount,
      currency:
        course.currency ?? "JOD",

      status: "pending",

      subscription_months:
        subscriptionMonths,

      auto_renew_requested:
        autoRenew,

      source: "manual",
    })
    .select("id")
    .single();

  if (error || !newOrder) {
    if (
      error?.message.includes(
        "unique_pending_order_per_user_course"
      ) ||
      error?.message
        .toLowerCase()
        .includes("duplicate")
    ) {
      redirect(
        `/checkout/${courseId}`
      );
    }

    throw new Error(
      error?.message ??
        "تعذر إنشاء الطلب"
    );
  }

  const paymentUrl =
    await createPaymentPage({
      orderId: newOrder.id,
      amount: totalAmount,
      currency:
        course.currency ?? "JOD",
      description,
      customerEmail:
        user.email ?? "",
      customerName:
        user.email?.split("@")[0] ??
        "Student",
      siteUrl: SITE_URL,
      tokenize: autoRenew,
    });

  redirect(paymentUrl);
}
