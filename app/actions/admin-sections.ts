"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

type CreatedSection = {
  id: string;
  title: string;
  order_index: number;
};

export async function createSection(
  courseId: string,
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
}> {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  if (!title) {
    return {
      success: false,
      message: "اسم القسم مطلوب.",
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_create_section",
    {
      p_course_id: courseId,
      p_title: title,
    }
  );

  if (error) {
    return {
      success: false,
      message: `تعذر إضافة القسم: ${error.message}`,
    };
  }

  const createdSection =
    data as CreatedSection | null;

  revalidatePath(
    `/admin/courses/${courseId}/sections`
  );

  return {
    success: true,
    message: `تمت إضافة "${
      createdSection?.title ?? title
    }" بالترتيب ${
      createdSection?.order_index ?? ""
    }.`,
  };
}


export async function updateSection(
  sectionId: string,
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const orderIndex = Number(
    formData.get("order_index")
  );

  if (!title) {
    throw new Error("Section title is required");
  }

  if (
    !Number.isInteger(orderIndex) ||
    orderIndex < 1
  ) {
    throw new Error(
      "Section order must be 1 or greater"
    );
  }

  const { error } = await supabase.rpc(
    "admin_update_section",
    {
      p_section_id: sectionId,
      p_course_id: courseId,
      p_title: title,
      p_order_index: orderIndex,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections`
  );
}


export async function deleteSection(
  sectionId: string,
  courseId: string
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "admin_delete_section",
    {
      p_section_id: sectionId,
      p_course_id: courseId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    `/admin/courses/${courseId}/sections`
  );
}
