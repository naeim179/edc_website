"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function getAdminOrders() {
  await requireAdmin();

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
        course_id
      `)
      .in("status", ["paid", "failed"])
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

  return orders.map((order) => ({
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
