"use server";

import { revalidatePath } from "next/cache";

import {
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth/admin-access";

import { createAdminClient } from "@/lib/supabase/admin";

async function ensureStudent(
  studentId: string
) {
  if (!studentId) {
    throw new Error(
      "معرّف الطالب غير صالح"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: student,
    error,
  } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!student) {
    throw new Error(
      "الطالب غير موجود"
    );
  }

  return admin;
}

export async function setStudentBlocked(
  studentId: string,
  shouldBlock: boolean
) {
  await requirePermission(
    "manage_students"
  );

  const admin =
    await ensureStudent(
      studentId
    );

  if (shouldBlock) {
    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await admin
      .from("subscriptions")
      .select("id")
      .eq(
        "student_id",
        studentId
      );

    if (subscriptionsError) {
      throw new Error(
        subscriptionsError.message
      );
    }

    const subscriptionIds =
      (
        subscriptions ?? []
      ).map(
        (subscription) =>
          subscription.id
      );

    const {
      error: renewError,
    } = await admin
      .from("subscriptions")
      .update({
        auto_renew: false,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "student_id",
        studentId
      );

    if (renewError) {
      throw new Error(
        renewError.message
      );
    }

    if (
      subscriptionIds.length > 0
    ) {
      const {
        error: tokenError,
      } = await admin
        .from(
          "subscription_payment_tokens"
        )
        .delete()
        .in(
          "subscription_id",
          subscriptionIds
        );

      if (tokenError) {
        throw new Error(
          tokenError.message
        );
      }
    }
  }

  const {
    error: authError,
  } =
    await admin.auth.admin.updateUserById(
      studentId,
      {
        ban_duration:
          shouldBlock
            ? "876000h"
            : "none",
      }
    );

  if (authError) {
    throw new Error(
      authError.message
    );
  }

  revalidatePath(
    "/admin/students"
  );

  revalidatePath(
    `/admin/students/${studentId}`
  );

  revalidatePath(
    "/my-courses"
  );

  return {
    success: true,
  };
}

export async function deleteStudentAccount(
  studentId: string,
  formData: FormData
) {
  await requireSuperAdmin();

  const confirmation =
    String(
      formData.get(
        "confirmation"
      ) ?? ""
    ).trim();

  if (
    confirmation !== "DELETE"
  ) {
    throw new Error(
      "يجب كتابة DELETE لتأكيد الحذف"
    );
  }

  const admin =
    await ensureStudent(
      studentId
    );

  const {
    error,
  } =
    await admin.auth.admin.deleteUser(
      studentId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/students"
  );

  return {
    success: true,
  };
}
