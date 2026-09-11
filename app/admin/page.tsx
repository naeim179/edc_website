import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import AdminDashboardContent from "@/components/AdminDashboardContent";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();


  const [
    { count: coursesCount },
    { count: studentsCount },
    { count: enrollmentsCount },
    { count: ordersCount },
    { count: pendingOrdersCount },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("role", "student"),

    supabase
      .from("enrollments")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),
  ]);


  return (
    <AppShell>
      <AdminDashboardContent
        coursesCount={coursesCount ?? 0}
        studentsCount={studentsCount ?? 0}
        enrollmentsCount={enrollmentsCount ?? 0}
        ordersCount={ordersCount ?? 0}
        pendingOrdersCount={pendingOrdersCount ?? 0}
      />
    </AppShell>
  );
}
