import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import AdminDashboardContent from "@/components/AdminDashboardContent";
import { getAdminAccess } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";

export default async function AdminDashboardPage() {
  const access = await getAdminAccess();

  if (!access) {
    redirect("/");
  }

  const can = (permission: string) =>
    access.isSuper || access.permissions.includes(permission);

  const show = {
    courses: can("manage_courses"),
    students: can("manage_students"),
    enrollments: can("manage_students"),
    orders: can("view_orders"),
  };

  const supabase = await createClient();
  const stats = await getAdminDashboardStats(supabase);

  return (
    <AppShell>
      <AdminDashboardContent
        show={show}
        coursesCount={show.courses ? stats.coursesCount : 0}
        studentsCount={show.students ? stats.studentsCount : 0}
        enrollmentsCount={show.enrollments ? stats.enrollmentsCount : 0}
        ordersCount={show.orders ? stats.ordersCount : 0}
        paidOrdersCount={show.orders ? stats.paidOrdersCount : 0}
        failedOrdersCount={show.orders ? stats.failedOrdersCount : 0}
      />
    </AppShell>
  );
}
