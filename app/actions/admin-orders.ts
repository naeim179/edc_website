"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";


export async function getAdminOrders() {
  await requireAdmin();

  const supabase = await createClient();


  const { data: orders, error } =
    await supabase
      .from("orders")
      .select(`
        id,
        amount,
        currency,
        status,
        created_at,
        user_id,
        course_id
      `)
      .order("created_at", {
        ascending: false,
      });


  if (error) {
    throw new Error(error.message);
  }


  const courseIds =
    orders?.map((order) => order.course_id) ?? [];


  const userIds =
    orders?.map((order) => order.user_id) ?? [];


  const { data: courses } =
    await supabase
      .from("courses")
      .select("id,title")
      .in("id", courseIds);



  const { data: profiles } =
    await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);



  return (
    orders?.map((order) => ({
      ...order,

      studentName:
        profiles?.find(
          (profile) =>
            profile.id === order.user_id
        )?.full_name ?? "Unknown",


      courses: [
        {
          title:
            courses?.find(
              (course) =>
                course.id === order.course_id
            )?.title ?? "Course not found",
        },
      ],
    })) ?? []
  );
}



export async function approveOrder(orderId: string) {

  await requireAdmin();

  const supabase = await createClient();


  const { data: order, error: orderError } =
    await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        course_id
      `)
      .eq("id", orderId)
      .single();



  if (orderError || !order) {
    throw new Error("Order not found");
  }



  const { error: updateError } =
    await supabase
      .from("orders")
      .update({
        status: "paid",
      })
      .eq("id", orderId);



  if (updateError) {
    throw new Error(updateError.message);
  }



  const { error: enrollmentError } =
    await supabase
      .from("enrollments")
      .insert({
        student_id: order.user_id,
        course_id: order.course_id,
      });



  if (
    enrollmentError &&
    !enrollmentError.message.includes("duplicate")
  ) {
    throw new Error(enrollmentError.message);
  }



  return true;
}
