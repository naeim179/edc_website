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

type PaymentMethod =
  | "paytabs"
  | "paypal"
  | "cliq";

export async function createOrder(
  courseId: string,
  subscriptionMonths: SubscriptionMonths = 1,
  autoRenew = false,
  paymentMethod: PaymentMethod = "paytabs"
) {
  if (
    subscriptionMonths !== 1 &&
    subscriptionMonths !== 3
  ) {
    throw new Error(
      "مدة الاشتراك غير صالحة"
    );
  }

  if (
    paymentMethod !== "paytabs" &&
    paymentMethod !== "cliq"
  ) {
    throw new Error(
      "طريقة الدفع غير متاحة حالياً"
    );
  }

  const supabase =
    await createClient();

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
      is_free,
      discount_type,
      discount_value
    `)
    .eq("id", courseId)
    .maybeSingle();

  if (
    courseError ||
    !course
  ) {
    throw new Error(
      "Course not found"
    );
  }

  // سعر الدورة الأساسي بالدولار.
  const monthlyPriceUsd =
    calculateFinalPrice(
      Number(course.price ?? 0),
      course.discount_type,
      Number(
        course.discount_value ?? 0
      )
    );

  if (
    course.is_free ||
    monthlyPriceUsd === 0
  ) {
    await enrollInFreeCourse(
      user.id,
      courseId
    );

    revalidatePath(
      "/my-courses"
    );

    redirect(
      `/courses/${courseId}`
    );
  }

  const totalUsd =
    Number(
      (
        monthlyPriceUsd *
        subscriptionMonths
      ).toFixed(2)
    );

  const chargedAmount = totalUsd;

  const description =
    `${course.title} - ${subscriptionMonths} month subscription`;

  const admin =
    createAdminClient();

  const orderFields = {
    amount: chargedAmount,
    currency: "USD",
    subscription_months:
      subscriptionMonths,
    auto_renew_requested:
      autoRenew,
    payment_method:
      paymentMethod,
    source: "manual",
  };

  const {
    data: existingPendingOrder,
  } = await admin
    .from("orders")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "pending")
    .maybeSingle();

  let orderId: string;

  if (existingPendingOrder) {
    const {
      error: updateError,
    } = await admin
      .from("orders")
      .update(orderFields)
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

    orderId =
      existingPendingOrder.id;
  } else {
    const {
      data: newOrder,
      error,
    } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: courseId,
        status: "pending",
        ...orderFields,
      })
      .select("id")
      .single();

    if (
      error ||
      !newOrder
    ) {
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

    orderId = newOrder.id;
  }

  // CliQ: لا نستدعي PayTabs أبداً
  if (paymentMethod === "cliq") {
    redirect(
      `/checkout/success?order=${orderId}&method=cliq`
    );
  }

  const paymentUrl =
    await createPaymentPage({
      orderId,

      amount:
        chargedAmount,

      currency:
        "USD",

      description,

      customerEmail:
        user.email ?? "",

      customerName:
        user.email
          ?.split("@")[0] ??
        "Student",

      siteUrl:
        SITE_URL,

      tokenize:
        autoRenew,
    });

  redirect(paymentUrl);
}
