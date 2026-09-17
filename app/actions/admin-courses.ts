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


  const title =
    String(formData.get("title") ?? "");


  const description =
    String(formData.get("description") ?? "");


  const category =
    String(formData.get("category") ?? "");


  const courseType =
    String(formData.get("course_type") ?? "");



  const isPublished =
    formData.get("is_published") === "on";



  if (
    !["group","private"].includes(courseType)
  ) {
    throw new Error("اختر نوع الدورة");
  }



  const { error } =
    await supabase
      .from("courses")
      .insert({

        title,
        description,
        category,

        course_type: courseType,

        price: 0,
        currency:"JOD",
        is_free:false,

        is_published:isPublished,

      });



  if(error){
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
