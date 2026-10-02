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

  const { data: coupons, error: couponsError } =
    await supabase
      .from("course_coupons")
      .select(`
        id,
        code,
        is_active,
        is_used,
        used_by,
        used_at,
        created_at,
        course:courses(
          title
        ),
        user:profiles(
          full_name,
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      });

  if (couponsError) {
    throw new Error(couponsError.message);
  }

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
