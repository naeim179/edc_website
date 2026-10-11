"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type CouponType =
  | "free_subscription"
  | "discount";

type DiscountType =
  | "percentage"
  | "fixed";

function parseJordanDateTime(
  value: string
) {
  const cleaned =
    value.trim();

  if (!cleaned) {
    return null;
  }

  const hasZone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(
      cleaned
    );

  const date =
    new Date(
      hasZone
        ? cleaned
        : `${cleaned}+03:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "Invalid coupon date"
    );
  }

  return date;
}

export async function createCoupon(
  formData: FormData
) {
  await requirePermission(
    "manage_coupons"
  );

  const code =
    String(
      formData.get("code") ??
        ""
    )
      .trim()
      .toUpperCase();

  const courseId =
    String(
      formData.get(
        "course_id"
      ) ?? ""
    ).trim();

  const couponType =
    String(
      formData.get(
        "coupon_type"
      ) ??
        "free_subscription"
    ) as CouponType;

  const isActive =
    formData.get(
      "is_active"
    ) === "on";

  if (
    !/^[A-Z0-9_-]{3,50}$/.test(
      code
    )
  ) {
    throw new Error(
      "Coupon code must be 3-50 characters and use letters, numbers, - or _."
    );
  }

  if (!courseId) {
    throw new Error(
      "Select a course."
    );
  }

  if (
    couponType !==
      "free_subscription" &&
    couponType !==
      "discount"
  ) {
    throw new Error(
      "Invalid coupon type."
    );
  }

  const validFrom =
    parseJordanDateTime(
      String(
        formData.get(
          "valid_from"
        ) ?? ""
      )
    ) ??
    new Date();

  const validUntil =
    parseJordanDateTime(
      String(
        formData.get(
          "valid_until"
        ) ?? ""
      )
    );

  if (
    validUntil &&
    validUntil <=
      validFrom
  ) {
    throw new Error(
      "Coupon expiry must be after the start date."
    );
  }

  const maxUsesRaw =
    String(
      formData.get(
        "max_uses"
      ) ?? ""
    ).trim();

  let maxUses:
    number | null =
    null;

  if (maxUsesRaw) {
    maxUses =
      Number(
        maxUsesRaw
      );

    if (
      !Number.isInteger(
        maxUses
      ) ||
      maxUses < 1 ||
      maxUses > 100000
    ) {
      throw new Error(
        "Invalid maximum uses."
      );
    }
  }

  let subscriptionMonths:
    number | null =
    null;

  let discountType:
    DiscountType | null =
    null;

  let discountValue:
    number | null =
    null;

  if (
    couponType ===
    "free_subscription"
  ) {
    subscriptionMonths =
      Number(
        formData.get(
          "subscription_months"
        ) ?? 0
      );

    if (
      !Number.isInteger(
        subscriptionMonths
      ) ||
      subscriptionMonths <
        1 ||
      subscriptionMonths >
        60
    ) {
      throw new Error(
        "Subscription duration must be between 1 and 60 months."
      );
    }
  } else {
    const rawDiscountType =
      String(
        formData.get(
          "discount_type"
        ) ??
          "percentage"
      );

    discountType =
      rawDiscountType ===
      "fixed"
        ? "fixed"
        : "percentage";

    discountValue =
      Number(
        formData.get(
          "discount_value"
        ) ?? 0
      );

    if (
      !Number.isFinite(
        discountValue
      ) ||
      discountValue <= 0
    ) {
      throw new Error(
        "Invalid discount value."
      );
    }

    if (
      discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      throw new Error(
        "Percentage discount cannot exceed 100%."
      );
    }
  }

  const admin =
    createAdminClient();

  const {
    error,
  } =
    await admin
      .from(
        "course_coupons"
      )
      .insert({
        code,
        course_id:
          courseId,
        coupon_type:
          couponType,
        subscription_months:
          subscriptionMonths,
        discount_type:
          discountType,
        discount_value:
          discountValue,
        valid_from:
          validFrom.toISOString(),
        valid_until:
          validUntil
            ? validUntil.toISOString()
            : null,
        max_uses:
          maxUses,
        used_count:
          0,
        is_active:
          isActive,
        is_used:
          false,
        used_by:
          null,
        used_at:
          null,
        updated_at:
          new Date()
            .toISOString(),
      });

  if (error) {
    if (
      error.code ===
        "23505"
    ) {
      throw new Error(
        "Coupon code already exists."
      );
    }

    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/coupons"
  );
}

export async function toggleCoupon(
  id: string,
  active: boolean
) {
  await requirePermission(
    "manage_coupons"
  );

  const admin =
    createAdminClient();

  if (!active) {
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
          max_uses,
          used_count,
          valid_until
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
      throw new Error(
        couponError?.message ??
          "Coupon not found."
      );
    }

    if (
      coupon.max_uses !=
        null &&
      Number(
        coupon.used_count
      ) >=
        Number(
          coupon.max_uses
        )
    ) {
      throw new Error(
        "This coupon has reached its usage limit."
      );
    }

    if (
      coupon.valid_until &&
      new Date(
        coupon.valid_until
      ).getTime() <=
        Date.now()
    ) {
      throw new Error(
        "This coupon has expired."
      );
    }
  }

  const {
    error,
  } =
    await admin
      .from(
        "course_coupons"
      )
      .update({
        is_active:
          !active,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/coupons"
  );

  revalidatePath(
    `/admin/coupons/${id}`
  );
}

export async function deleteCoupon(
  id: string
) {
  await requirePermission(
    "manage_coupons"
  );

  if (!id) {
    throw new Error(
      "Missing coupon id."
    );
  }

  const admin =
    createAdminClient();

  const {
    count: historyCount,
    error: historyError,
  } =
    await admin
      .from(
        "coupon_redemptions"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "coupon_id",
        id
      );

  if (historyError) {
    throw new Error(
      historyError.message
    );
  }

  if (
    (historyCount ?? 0) >
    0
  ) {
    throw new Error(
      "This coupon has usage history and cannot be deleted. Disable it instead."
    );
  }

  const {
    error,
  } =
    await admin
      .from(
        "course_coupons"
      )
      .delete()
      .eq(
        "id",
        id
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/coupons"
  );

  redirect(
    "/admin/coupons"
  );
}
