import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminCouponsContent from "@/components/admin/AdminCouponsContent";

import { getAdminAccess } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCouponsPage() {
  const access = await getAdminAccess();

  if (!access) {
    redirect("/");
  }

  const canManage =
    access.isSuper ||
    access.permissions.includes("manage_coupons");

  if (!canManage) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const { data: coupons } = await supabase
    .from("course_coupons")
    .select(`
      id,
      code,
      is_active,
      is_used,
      created_at,
      course:courses(
        title
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title
    `)
    .order("created_at", {
      ascending: false,
    });


  return (
    <AppShell>
      <AdminCouponsContent
        coupons={coupons ?? []}
        courses={courses ?? []}
      />
    </AppShell>
  );
}
