"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPaymentPage } from "@/lib/paytabs";

const SITE_URL =
  process.env.SITE_URL ?? "http://localhost:3000";


export async function createOrder(
  courseId: string,
  offerId?: string
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
        is_free
      `)
      .eq("id", courseId)
      .maybeSingle();


  if (courseError || !course) {
    throw new Error("Course not found");
  }


  let offerPrice = course.price;
  let offerFinalPrice = course.price;


  if (offerId) {

    const { data: offer } = await supabase
      .from("course_offers")
      .select("price, final_price")
      .eq("id", offerId)
      .maybeSingle();


    if (offer) {
      offerPrice = offer.price;
      offerFinalPrice =
        offer.final_price ?? offer.price;
    }

  }


  if (course.is_free) {
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

    const paymentUrl = await createPaymentPage({
      orderId: existingPendingOrder.id,
      amount: offerFinalPrice,
      currency: course.currency,
      description: course.title,
      customerEmail: user.email ?? "",
      customerName: user.email?.split("@")[0] ?? "Student",
      siteUrl: SITE_URL,
    });

    redirect(paymentUrl);
  }


  const { data: newOrder, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      course_id: courseId,
      amount: offerFinalPrice,
      currency: course.currency,
      status: "pending",
    })
    .select("id")
    .single();


  if (error || !newOrder) {

    if (
      error?.message.includes("unique_pending_order_per_user_course") ||
      error?.message.includes("duplicate")
    ) {
      redirect(`/courses/${courseId}`);
    }

    throw new Error(error?.message ?? "تعذر إنشاء الطلب");
  }


  const paymentUrl = await createPaymentPage({
    orderId: newOrder.id,
    amount: offerFinalPrice,
    currency: course.currency,
    description: course.title,
    customerEmail: user.email ?? "",
    customerName: user.email?.split("@")[0] ?? "Student",
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


  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}
