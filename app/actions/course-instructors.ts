"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


export async function assignTeacherToCourse(
  courseId: string,
  teacherId: string
) {
  const supabase = await createClient();


  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    throw new Error("Unauthorized");
  }


  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();


  if (profile?.role !== "admin") {
    throw new Error("Only admins can assign teachers");
  }


  const { error } = await supabase
    .from("course_instructors")
    .insert({
      course_id: courseId,
      teacher_id: teacherId,
    });


  if (error) {
    throw new Error(error.message);
  }


  revalidatePath(`/admin/courses/${courseId}/teachers`);
}
