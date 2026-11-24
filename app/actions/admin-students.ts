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
    !Number.isInteger(days) ||
    days <= 0 ||
    days > 3650
  ) {
    throw new Error("عدد الأيام غير صالح");
  }

  const supabase = await createClient();

  const { error: updateError } =
    await supabase.rpc(
      "admin_extend_student_subscription",
      {
        p_student_id: studentId,
        p_course_id: courseId,
        p_days: days,
      }
    );

  if (updateError) {
    if (updateError.message.includes("SUBSCRIPTION_NOT_FOUND")) {
      throw new Error("لا يوجد اشتراك لهذه الدورة");
    }
    if (updateError.message.includes("GROUP_CAPACITY_REACHED")) {
      throw new Error("اكتمل عدد طلاب هذا القروب");
    }
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
