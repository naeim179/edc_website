"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";


export async function createCourse(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();


  const title = String(
    formData.get("title") ?? ""
  );

  const description = String(
    formData.get("description") ?? ""
  );

  const category = String(
    formData.get("category") ?? ""
  );


  const isPublished =
    formData.get("is_published") === "on";


  const groupEnabled =
    formData.get("group_enabled") === "on";


  const privateEnabled =
    formData.get("private_enabled") === "on";


  const groupPrice =
    Number(
      formData.get("group_price") ?? 0
    );


  const privatePrice =
    Number(
      formData.get("private_price") ?? 0
    );



  if (!groupEnabled && !privateEnabled) {
    throw new Error(
      "اختر نوع تسجيل واحد على الأقل"
    );
  }



  const {
    data: course,
    error: courseError,
  } =
    await supabase
      .from("courses")
      .insert({
        title,
        description,
        category,

        // مؤقت حتى ننقل النظام بالكامل
        price: 0,
        currency: "JOD",
        is_free: false,

        is_published: isPublished,
      })
      .select("id")
      .single();



  if (courseError || !course) {
    throw new Error(
      courseError?.message ??
      "Course creation failed"
    );
  }



  const offers = [];



  if (groupEnabled) {
    offers.push({
      course_id: course.id,
      type: "group",
      price: groupPrice,
    });
  }



  if (privateEnabled) {
    offers.push({
      course_id: course.id,
      type: "private",
      price: privatePrice,
    });
  }



  const {
    error: offerError,
  } =
    await supabase
      .from("course_offers")
      .insert(offers);



  if (offerError) {
    throw new Error(
      offerError.message
    );
  }



  revalidatePath(
    "/admin/courses"
  );

  redirect(
    "/admin/courses"
  );
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
      .eq(
        "id",
        courseId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/courses"
  );
}




export async function updateCourse(
  courseId: string,
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();


  const title = String(
    formData.get("title") ?? ""
  );

  const description = String(
    formData.get("description") ?? ""
  );

  const category = String(
    formData.get("category") ?? ""
  );

  const isPublished =
    formData.get("is_published") === "on";



  const { error } =
    await supabase
      .from("courses")
      .update({
        title,
        description,
        category,
        is_published: isPublished,
      })
      .eq(
        "id",
        courseId
      );


  if (error) {
    throw new Error(
      error.message
    );
  }


  revalidatePath(
    "/admin/courses"
  );

  redirect(
    "/admin/courses"
  );
}
