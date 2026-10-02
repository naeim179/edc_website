import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminCouponDetails from "@/components/admin/AdminCouponDetails";

import { getAdminAccess } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCouponDetailsPage({
  params,
}: PageProps) {
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

  const { id } = await params;

  const supabase = await createClient();

  const {
    data: coupon,
    error: couponError,
  } = await supabase
    .from("course_coupons")
    .select(`
      id,
      code,
      course_id,
      is_active,
      is_used,
      used_by,
      used_at,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (couponError) {
    throw new Error(couponError.message);
  }

  if (!coupon) {
    notFound();
  }

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", coupon.course_id)
    .maybeSingle();

  let usedUser: {
    username: string | null;
    full_name: string | null;
  } | null = null;

  if (coupon.used_by) {
    const { data: user } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", coupon.used_by)
      .maybeSingle();

    usedUser = user;
  }

  return (
    <AppShell>
      <AdminCouponDetails
        coupon={{
          id: coupon.id,
          code: coupon.code,
          isActive: coupon.is_active,
          isUsed: coupon.is_used,
          usedAt: coupon.used_at,
          createdAt: coupon.created_at,
        }}
        courseTitle={course?.title ?? null}
        usedUser={usedUser}
      />
    </AppShell>
  );
}
