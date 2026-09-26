import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminDashboardStats {
  coursesCount: number;
  studentsCount: number;
  enrollmentsCount: number;
  ordersCount: number;
  paidOrdersCount: number;
  failedOrdersCount: number;
}

export async function getAdminDashboardStats(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  const results = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "failed"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const labels = [
    "courses",
    "students",
    "enrollments",
    "orders",
    "paidOrders",
    "failedOrders",
  ];

  results.forEach(({ error }, i) => {
    if (error) {
      console.error(`admin-dashboard: ${labels[i]} query failed:`, error.message);
    }
  });

  const [courses, students, enrollments, orders, paidOrders, failedOrders] =
    results;

  return {
    coursesCount: courses.count ?? 0,
    studentsCount: students.count ?? 0,
    enrollmentsCount: enrollments.count ?? 0,
    ordersCount: orders.count ?? 0,
    paidOrdersCount: paidOrders.count ?? 0,
    failedOrdersCount: failedOrders.count ?? 0,
  };
}
