"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

function getDiscount(
  formData: FormData
) {
  const discountTypeRaw = String(
    formData.get("discount_type") ?? "percentage"
  );

  const discountType =
    discountTypeRaw === "fixed"
      ? "fixed"
      : "percentage";

  const discountValue = Number(
    formData.get("discount_value") ?? 0
  );

  if (
    !Number.isFinite(discountValue) ||
    discountValue < 0
  ) {
    throw new Error("قيمة الخصم غير صحيحة");
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%");
  }

  return {
    discountType,
    discountValue,
  };
}

export async function createCourse(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  );

  const category = String(
    formData.get("category") ?? ""
  );

  const courseType = String(
    formData.get("course_type") ?? ""
  );

  const coursePrice = Number(
    formData.get("course_price") ?? 0
  );

  const isPublished =
    formData.get("is_published") === "on";

  if (
    !["group", "private"].includes(courseType)
  ) {
    throw new Error("اختر نوع الدورة");
  }

  if (
    !Number.isFinite(coursePrice) ||
    coursePrice < 0
  ) {
    throw new Error("السعر غير صحيح");
  }

  const {
    discountType,
    discountValue,
  } = getDiscount(formData);

  if (
    discountType === "fixed" &&
    discountValue > coursePrice
  ) {
    throw new Error(
      "الخصم لا يمكن أن يكون أكبر من سعر الدورة"
    );
  }

  const { error } =
    await supabase
      .from("courses")
      .insert({
        title,
        description,
        category,
        course_type: courseType,
        price: coursePrice,
        currency: "JOD",
        is_free: false,
        discount_type: discountType,
        discount_value: discountValue,
        is_published: isPublished,
      });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/courses");

  redirect("/admin/courses");
}

export async function deleteCourse(
  courseId: string
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } =
    await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/courses");
}

export async function updateCourse(
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  );

  const category = String(
    formData.get("category") ?? ""
  );

  const coursePrice = Number(
    formData.get("course_price") ?? 0
  );

  const isFree =
    formData.get("is_free") === "on";

  const isPublished =
    formData.get("is_published") === "on";

  if (
    !Number.isFinite(coursePrice) ||
    coursePrice < 0
  ) {
    throw new Error("السعر غير صحيح");
  }

  const {
    discountType,
    discountValue,
  } = getDiscount(formData);

  if (
    discountType === "fixed" &&
    discountValue > coursePrice
  ) {
    throw new Error(
      "الخصم لا يمكن أن يكون أكبر من سعر الدورة"
    );
  }

  const { error } =
    await supabase
      .from("courses")
      .update({
        title,
        description,
        category,
        price: coursePrice,
        is_free: isFree,
        discount_type: discountType,
        discount_value: discountValue,
        is_published: isPublished,
      })
      .eq("id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}`);

  redirect("/admin/courses");
}
