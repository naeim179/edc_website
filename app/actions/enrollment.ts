"use server";

import { createClient } from "@/lib/supabase/server";
import { activateZeroPriceCourse } from "@/lib/free-enrollment";

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

export async function enrollInCourse(
  courseId: string
) {
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

  // فحص النشر والسعر والدور بيصير جوّا الدالة المشتركة
  await activateZeroPriceCourse(user.id, courseId);

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

  // 1) التسجيل لازم يكون للمستخدم الحالي (مش لطالب ثاني)
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, course_id")
    .eq("id", enrollmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  if (!enrollment) {
    throw new Error("غير مصرح لك بهذا التسجيل");
  }

  // 2) والدرس لازم يتبع نفس الدورة اللي مسجل فيها
  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select("id, section:sections ( course_id )")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    throw new Error(lessonError.message);
  }

  const lessonInfo = lessonRow as unknown as {
    section: { course_id: string } | { course_id: string }[] | null;
  } | null;

  const lessonSection = Array.isArray(lessonInfo?.section)
    ? lessonInfo?.section[0]
    : lessonInfo?.section;

  if (!lessonInfo || lessonSection?.course_id !== enrollment.course_id) {
    throw new Error("هذا الدرس لا يتبع هذه الدورة");
  }

  const { error } = await supabase.rpc("complete_lesson_progress", {
    p_enrollment_id: enrollmentId,
    p_lesson_id: lessonId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
  };
}
