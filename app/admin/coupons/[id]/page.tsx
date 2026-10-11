import {
  notFound,
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminCouponDetails from "@/components/admin/AdminCouponDetails";

import { getAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params:
    Promise<{
      id: string;
    }>;
};

export default async function AdminCouponDetailsPage({
  params,
}: PageProps) {
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

  const {
    id,
  } =
    await params;

  const admin =
    createAdminClient();

  const {
    data: coupon,
    error:
      couponError,
  } =
    await admin
      .from(
        "course_coupons"
      )
      .select(`
        id,
        code,
        course_id,
        coupon_type,
        subscription_months,
        discount_type,
        discount_value,
        is_active,
        valid_from,
        valid_until,
        max_uses,
        used_count,
        created_at
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (
    couponError ||
    !coupon
  ) {
    notFound();
  }

  const [
    courseResult,
    redemptionResult,
  ] =
    await Promise.all([
      admin
        .from("courses")
        .select("title")
        .eq(
          "id",
          coupon.course_id
        )
        .maybeSingle(),

      admin
        .from(
          "coupon_redemptions"
        )
        .select(`
          id,
          user_id,
          status,
          original_amount,
          discount_amount,
          final_amount,
          reservation_expires_at,
          redeemed_at,
          created_at
        `)
        .eq(
          "coupon_id",
          coupon.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    redemptionResult.error
  ) {
    throw new Error(
      redemptionResult.error.message
    );
  }

  const redemptions =
    redemptionResult.data ??
    [];

  const userIds =
    Array.from(
      new Set(
        redemptions.map(
          (
            row
          ) =>
            row.user_id
        )
      )
    );

  const {
    data: profiles,
    error:
      profilesError,
  } =
    userIds.length >
    0
      ? await admin
          .from(
            "profiles"
          )
          .select(`
            id,
            full_name,
            username
          `)
          .in(
            "id",
            userIds
          )
      : {
          data: [],
          error: null,
        };

  if (
    profilesError
  ) {
    throw new Error(
      profilesError.message
    );
  }

  const profileMap =
    new Map(
      (
        profiles ??
        []
      ).map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );

  return (
    <AppShell>
      <AdminCouponDetails
        coupon={{
          id:
            coupon.id,
          code:
            coupon.code,
          couponType:
            coupon.coupon_type as
              | "free_subscription"
              | "discount",
          subscriptionMonths:
            coupon.subscription_months ==
            null
              ? null
              : Number(
                  coupon.subscription_months
                ),
          discountType:
            coupon.discount_type as
              | "percentage"
              | "fixed"
              | null,
          discountValue:
            coupon.discount_value ==
            null
              ? null
              : Number(
                  coupon.discount_value
                ),
          isActive:
            coupon.is_active,
          validFrom:
            coupon.valid_from,
          validUntil:
            coupon.valid_until,
          maxUses:
            coupon.max_uses,
          usedCount:
            Number(
              coupon.used_count
            ),
          createdAt:
            coupon.created_at,
        }}
        courseTitle={
          courseResult.data
            ?.title ??
          null
        }
        redemptions={
          redemptions.map(
            (
              row
            ) => {
              const profile =
                profileMap.get(
                  row.user_id
                );

              return {
                id:
                  row.id,
                status:
                  row.status as
                    | "reserved"
                    | "redeemed"
                    | "released",
                originalAmount:
                  Number(
                    row.original_amount ??
                      0
                  ),
                discountAmount:
                  Number(
                    row.discount_amount ??
                      0
                  ),
                finalAmount:
                  Number(
                    row.final_amount ??
                      0
                  ),
                redeemedAt:
                  row.redeemed_at,
                reservationExpiresAt:
                  row.reservation_expires_at,
                createdAt:
                  row.created_at,
                userName:
                  profile
                    ?.full_name ||
                  profile
                    ?.username ||
                  "Student",
              };
            }
          )
        }
      />
    </AppShell>
  );
}
