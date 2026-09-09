"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function resetStudentProgress(
  studentId: string,
  enrollmentId: string
) {
  await requireAdmin();

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
}

export async function removeStudentEnrollment(
  studentId: string,
  enrollmentId: string
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}
