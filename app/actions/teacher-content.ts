"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCourse } from "@/lib/auth/can-manage-course";

async function requireCourseAccess(courseId: string) {
  const allowed = await canManageCourse(courseId);

  if (!allowed) {
    throw new Error("Unauthorized");
  }
}

async function requireSectionInCourse(
  sectionId: string,
  courseId: string
) {
  const admin = createAdminClient();

  const { data: section, error } = await admin
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!section) {
    throw new Error("Section not found");
  }
}

export async function teacherCreateSection(
  courseId: string,
  formData: FormData
) {
  await requireCourseAccess(courseId);

  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    throw new Error("اسم القسم مطلوب");
  }

  const admin = createAdminClient();

  const { data: lastSection } = await admin
    .from("sections")
    .select("order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderIndex = (lastSection?.order_index ?? 0) + 1;

  const { error } = await admin
    .from("sections")
    .insert({
      course_id: courseId,
      title,
      order_index: orderIndex,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function teacherUpdateSection(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  await requireCourseAccess(courseId);
  await requireSectionInCourse(sectionId, courseId);

  const title = String(formData.get("title") ?? "").trim();
  const orderIndex = Number(formData.get("order_index"));

  if (!title) {
    throw new Error("اسم القسم مطلوب");
  }

  if (!Number.isInteger(orderIndex) || orderIndex < 1) {
    throw new Error("ترتيب القسم غير صحيح");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("sections")
    .update({
      title,
      order_index: orderIndex,
    })
    .eq("id", sectionId)
    .eq("course_id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function teacherDeleteSection(
  sectionId: string,
  courseId: string
) {
  await requireCourseAccess(courseId);
  await requireSectionInCourse(sectionId, courseId);

  const admin = createAdminClient();

  const { error } = await admin
    .from("sections")
    .delete()
    .eq("id", sectionId)
    .eq("course_id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function teacherCreateLesson(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  await requireCourseAccess(courseId);
  await requireSectionInCourse(sectionId, courseId);

  const title = String(formData.get("title") ?? "").trim();
  const contentUrl = String(formData.get("content_url") ?? "").trim();
  const orderIndex = Number(formData.get("order_index") ?? 0);
  const isFreePreview =
    formData.get("is_free_preview") === "on";

  if (!title) {
    throw new Error("عنوان الدرس مطلوب");
  }

  const admin = createAdminClient();

  const { error } = await admin
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
    `/teacher/courses/${courseId}/sections/${sectionId}/lessons`
  );
}

export async function teacherUpdateLesson(
  lessonId: string,
  courseId: string,
  sectionId: string,
  formData: FormData
) {
  await requireCourseAccess(courseId);
  await requireSectionInCourse(sectionId, courseId);

  const title = String(formData.get("title") ?? "").trim();
  const contentUrl = String(formData.get("content_url") ?? "").trim();
  const orderIndex = Number(formData.get("order_index") ?? 0);
  const isFreePreview =
    formData.get("is_free_preview") === "on";

  if (!title) {
    throw new Error("عنوان الدرس مطلوب");
  }

  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  const { error } = await admin
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
    `/teacher/courses/${courseId}/sections/${sectionId}/lessons`
  );
}

export async function teacherDeleteLesson(
  lessonId: string,
  courseId: string,
  sectionId: string
) {
  await requireCourseAccess(courseId);
  await requireSectionInCourse(sectionId, courseId);

  const admin = createAdminClient();

  const { error } = await admin
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("section_id", sectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/teacher/courses/${courseId}/sections/${sectionId}/lessons`
  );
}
