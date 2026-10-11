import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminCouponsContent from "@/components/admin/AdminCouponsContent";

import { getAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCouponsPage() {
  const access =
    await getAdminAccess();

  if (!access) {
    redirect("/");
  }

  const canManage =
    access.isSuper ||
    access.permissions.includes(
      "manage_coupons"
    );

  if (!canManage) {
    redirect(
      "/admin"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: coupons,
    error:
      couponsError,
  } =
    await admin
      .from(
        "course_coupons"
      )
      .select(`
        id,
        code,
        coupon_type,
        subscription_months,
        discount_type,
        discount_value,
        is_active,
        valid_from,
        valid_until,
        max_uses,
        used_count,
        created_at,
        course:courses(
          title
        )
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (couponsError) {
    throw new Error(
      couponsError.message
    );
  }

  const {
    data: courses,
    error:
      coursesError,
  } =
    await admin
      .from("courses")
      .select(`
        id,
        title
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (coursesError) {
    throw new Error(
      coursesError.message
    );
  }

  return (
    <AppShell>
      <AdminCouponsContent
        coupons={
          coupons ?? []
        }
        courses={
          courses ?? []
        }
      />
    </AppShell>
  );
}
