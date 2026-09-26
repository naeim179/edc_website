import type { SupabaseClient } from "@supabase/supabase-js";

export interface TeacherCourse {
  id: string;
  title: string;
  description: string | null;
}

export async function getTeacherCourses(
  supabase: SupabaseClient,
  teacherId: string
): Promise<TeacherCourse[]> {
  const { data: assignments, error: assignmentsError } = await supabase
    .from("course_instructors")
    .select("course_id")
    .eq("teacher_id", teacherId);

  if (assignmentsError) {
    console.error("getTeacherCourses (assignments) error:", assignmentsError.message);
    throw new Error("تعذر تحميل الدورات الخاصة بك");
  }

  const courseIds = (assignments ?? []).map((a) => a.course_id);

  if (courseIds.length === 0) {
    return [];
  }

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, title, description")
    .in("id", courseIds);

  if (coursesError) {
    console.error("getTeacherCourses (courses) error:", coursesError.message);
    throw new Error("تعذر تحميل الدورات الخاصة بك");
  }

  return courses ?? [];
}
