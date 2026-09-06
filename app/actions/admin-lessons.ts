"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function createLesson(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "");
  const contentUrl = String(formData.get("content_url") ?? "");
  const orderIndex = Number(formData.get("order_index") ?? 0);
  const isFreePreview =
    formData.get("is_free_preview") === "on";

  if (!title.trim()) {
    throw new Error("Lesson title is required");
  }

  const { error } = await supabase
    .from("lessons")
    .insert({
      section_id: sectionId,
      title,
      content_url: contentUrl,
      order_index: orderIndex,
      is_free_preview: isFreePreview,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections/${sectionId}/lessons`
  );
}

export async function deleteLesson(
  lessonId: string,
  courseId: string,
  sectionId: string
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections/${sectionId}/lessons`
  );
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  sectionId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "");
  const contentUrl = String(formData.get("content_url") ?? "");
  const orderIndex = Number(formData.get("order_index") ?? 0);
  const isFreePreview =
    formData.get("is_free_preview") === "on";

  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      content_url: contentUrl,
      order_index: orderIndex,
      is_free_preview: isFreePreview,
    })
    .eq("id", lessonId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections/${sectionId}/lessons`
  );
}
