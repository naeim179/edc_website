import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import AdminDashboardContent from "@/components/AdminDashboardContent";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";

export default async function AdminDashboardPage() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const stats = await getAdminDashboardStats(supabase);

  return (
    <AppShell>
      <AdminDashboardContent
        coursesCount={stats.coursesCount}
        studentsCount={stats.studentsCount}
        enrollmentsCount={stats.enrollmentsCount}
        ordersCount={stats.ordersCount}
        paidOrdersCount={stats.paidOrdersCount}
        failedOrdersCount={stats.failedOrdersCount}
      />
    </AppShell>
  );
}
