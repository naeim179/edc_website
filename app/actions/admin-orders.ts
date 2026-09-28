"use server";

import { requirePermission } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

export async function getAdminOrders() {
  await requirePermission("view_orders");

  const supabase = await createClient();

  // الأدمن يرى النتائج النهائية فقط:
  // Paid أو Failed.
  // Pending لا يظهر لأنه مجرد محاولة دفع غير مكتملة.
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
        course_id,
        payment_method,
        payment_proof
      `)
      .in("status", ["paid", "failed", "pending"])
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(error.message);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  const courseIds = [
    ...new Set(
      orders.map((order) => order.course_id)
    ),
  ];

  const userIds = [
    ...new Set(
      orders.map((order) => order.user_id)
    ),
  ];

  const [{ data: courses }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id,title")
        .in("id", courseIds),

      supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", userIds),
    ]);

  const ordersWithProof = await Promise.all(
    orders.map(async (order) => {
      if (!order.payment_proof) {
        return order;
      }

      const { data } =
        await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(
            order.payment_proof,
            60 * 60
          );

      return {
        ...order,
        payment_proof:
          data?.signedUrl ??
          order.payment_proof,
      };
    })
  );

  return ordersWithProof.map((order) => ({
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
  }));
}


export async function updateOrderStatus(
  orderId: string,
  status: "paid" | "failed"
) {
  await requirePermission("view_orders");

  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
  };
}
