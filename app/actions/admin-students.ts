"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/admin-access";

export async function resetStudentProgress(
  studentId: string,
  enrollmentId: string
) {
  await requirePermission("manage_students");

  if (!studentId || !enrollmentId) {
    throw new Error("بيانات غير صالحة");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("enrollment_id", enrollmentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/my-courses");
}

export async function removeStudentEnrollment(
  studentId: string,
  enrollmentId: string
) {
  await requirePermission("manage_students");

  if (!studentId || !enrollmentId) {
    throw new Error("بيانات غير صالحة");
  }

  const admin = createAdminClient();

  const { error } = await admin.rpc(
    "admin_remove_student_enrollment",
    {
      p_student_id: studentId,
      p_enrollment_id: enrollmentId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/my-courses");
}

export async function extendStudentSubscription(
  formData: FormData
) {
  await requirePermission("manage_students");

  const studentId = String(
    formData.get("studentId") ?? ""
  );

  const courseId = String(
    formData.get("courseId") ?? ""
  );

  const days = Number(
    formData.get("days")
  );

  if (!studentId || !courseId) {
    throw new Error("بيانات غير صالحة");
  }

  if (
    !Number.isFinite(days) ||
    days <= 0
  ) {
    throw new Error("عدد الأيام غير صالح");
  }

  const supabase = await createClient();

  const {
    data: subscription,
    error: subError,
  } = await supabase
    .from("subscriptions")
    .select("id, expires_at")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (subError) {
    throw new Error(subError.message);
  }

  if (!subscription) {
    throw new Error(
      "لا يوجد اشتراك لهذه الدورة"
    );
  }

  const now = new Date();

  const currentExpiry =
    subscription.expires_at
      ? new Date(subscription.expires_at)
      : now;

  const base =
    currentExpiry > now
      ? currentExpiry
      : now;

  const newExpiry = new Date(
    base.getTime() +
      days * 24 * 60 * 60 * 1000
  );

  const { error: updateError } =
    await supabase
      .from("subscriptions")
      .update({
        expires_at:
          newExpiry.toISOString(),
        status: "active",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", subscription.id);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidatePath("/admin/students");
  revalidatePath(
    `/admin/students/${studentId}`
  );
  revalidatePath("/my-courses");
}
