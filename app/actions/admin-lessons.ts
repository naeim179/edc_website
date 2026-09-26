"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import { readLessonVideoForm } from "@/lib/lesson-video";

export async function createLesson(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  const allowed =
    await canManageCourse(
      courseId
    );

  if (!allowed) {
    throw new Error(
      "Unauthorized"
    );
  }

  const supabase =
    await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const orderIndex = Number(
    formData.get("order_index") ??
      0
  );

  const isFreePreview =
    formData.get(
      "is_free_preview"
    ) === "on";

  const lessonType =
    String(formData.get("lesson_type") ?? "recorded");

  const livePlatform =
    String(formData.get("live_platform") ?? "");

  const liveSchedule =
    String(formData.get("live_schedule") ?? "");

  if (!title) {
    throw new Error(
      "عنوان الدرس مطلوب"
    );
  }

  const video =
    lessonType === "live"
      ? {
          content_url:
            String(formData.get("content_url") ?? "").trim() || null,
          video_provider: null,
          youtube_video_id: null,
          mux_asset_id: null,
          mux_playback_id: null,
          bunny_library_id: null,
          bunny_video_id: null,
        }
      : readLessonVideoForm(formData);

  const { error } =
    await supabase
      .from("lessons")
      .insert({
        section_id:
          sectionId,

        title,

        ...video,

        order_index:
          orderIndex,

        is_free_preview:
          isFreePreview,

        lesson_type:
          lessonType,

        live_platform:
          lessonType === "live"
            ? livePlatform
            : null,

        live_schedule:
          lessonType === "live"
            ? liveSchedule
            : null,
      });

  if (error) {
    throw new Error(
      error.message
    );
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
  const allowed =
    await canManageCourse(
      courseId
    );

  if (!allowed) {
    throw new Error(
      "Unauthorized"
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase
      .from("lessons")
      .delete()
      .eq(
        "id",
        lessonId
      );

  if (error) {
    throw new Error(
      error.message
    );
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
  const allowed =
    await canManageCourse(
      courseId
    );

  if (!allowed) {
    throw new Error(
      "Unauthorized"
    );
  }

  const supabase =
    await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const orderIndex = Number(
    formData.get("order_index") ??
      0
  );

  const isFreePreview =
    formData.get(
      "is_free_preview"
    ) === "on";

  if (!title) {
    throw new Error(
      "عنوان الدرس مطلوب"
    );
  }

  const lessonType =
    String(formData.get("lesson_type") ?? "recorded");

  const video =
    lessonType === "live"
      ? {
          content_url:
            String(formData.get("content_url") ?? "").trim() || null,
          video_provider: null,
          youtube_video_id: null,
          mux_asset_id: null,
          mux_playback_id: null,
          bunny_library_id: null,
          bunny_video_id: null,
        }
      : readLessonVideoForm(formData);

  const { error } =
    await supabase
      .from("lessons")
      .update({
        title,

        ...video,

        lesson_type: lessonType,

        live_platform:
          lessonType === "live"
            ? String(formData.get("live_platform") ?? "")
            : null,

        live_schedule:
          lessonType === "live"
            ? String(formData.get("live_schedule") ?? "")
            : null,

        order_index:
          orderIndex,

        is_free_preview:
          isFreePreview,
      })
      .eq(
        "id",
        lessonId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections/${sectionId}/lessons`
  );
}
