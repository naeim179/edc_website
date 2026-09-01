"use server";

import { createClient } from "@/lib/supabase/server";

export async function checkEnrollmentStatus(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(enrollment);
}

export async function enrollInCourse(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const alreadyEnrolled = await checkEnrollmentStatus(courseId);

  if (alreadyEnrolled) {
    return {
      success: true,
      alreadyEnrolled: true,
    };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({
      student_id: user.id,
      course_id: courseId,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    alreadyEnrolled: false,
  };
}

export async function completeLesson(
  enrollmentId: string,
  lessonId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const { data: existingProgress, error: findError } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existingProgress) {
    const { error } = await supabase
      .from("lesson_progress")
      .update({
        is_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProgress.id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
    };
  }

  const { error } = await supabase
    .from("lesson_progress")
    .insert({
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      is_completed: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
  };
}

