"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function createSection(
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "");
  const orderIndex = Number(formData.get("order_index") ?? 0);

  if (!title.trim()) {
    throw new Error("Section title is required");
  }

  const { error } = await supabase
    .from("sections")
    .insert({
      course_id: courseId,
      title,
      order_index: orderIndex,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/courses/${courseId}/sections`);
}

export async function deleteSection(
  sectionId: string,
  courseId: string
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/courses/${courseId}/sections`);
}

export async function updateSection(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "");
  const orderIndex = Number(formData.get("order_index") ?? 0);

  const { error } = await supabase
    .from("sections")
    .update({
      title,
      order_index: orderIndex,
    })
    .eq("id", sectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/courses/${courseId}/sections`);
}
