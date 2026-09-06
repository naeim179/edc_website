"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createOrder(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }


  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(`
      id,
      price,
      currency,
      is_free
    `)
    .eq("id", courseId)
    .maybeSingle();


  if (courseError || !course) {
    throw new Error("Course not found");
  }


  if (course.is_free) {
    await createEnrollment(courseId, user.id);
    redirect(`/courses/${courseId}`);
  }


  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      course_id: courseId,
      amount: course.price,
      currency: course.currency,
      status: "paid",
    })
    .select("id")
    .single();


  if (error) {
    throw new Error(error.message);
  }


  await createEnrollment(courseId, user.id);


  revalidatePath("/my-courses");

  redirect(`/courses/${courseId}`);
}



async function createEnrollment(
  courseId:string,
  userId:string
){

  const supabase = await createClient();


  const {error}=await supabase
    .from("enrollments")
    .insert({
      course_id:courseId,
      student_id:userId,
    });


  if(error && !error.message.includes("duplicate")){
    throw new Error(error.message);
  }
}
