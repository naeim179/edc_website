"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function createCourse(formData: FormData) {
  await requireAdmin();

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const category = String(formData.get("category") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const currency = String(formData.get("currency") ?? "JOD");
  const isFree = formData.get("is_free") === "on";
  const isPublished = formData.get("is_published") === "on";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      category,
      price: isFree ? 0 : price,
      currency,
      is_free: isFree,
      is_published: isPublished,
      instructor_id: user.id,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}


export async function deleteCourse(courseId: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
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

  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const category = String(formData.get("category") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const currency = String(formData.get("currency") ?? "JOD");
  const isFree = formData.get("is_free") === "on";
  const isPublished = formData.get("is_published") === "on";


  const { error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      category,
      price: isFree ? 0 : price,
      currency,
      is_free: isFree,
      is_published: isPublished,
    })
    .eq("id", courseId);


  if (error) {
    throw new Error(error.message);
  }


  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
