import { createClient } from "@/lib/supabase/server";

export async function canManageCourse(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_super_admin, permissions")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false;
  }

  if (profile.role === "admin") {
    return Boolean(
      profile.is_super_admin ||
        (profile.permissions ?? []).includes("manage_courses")
    );
  }

  // An old assignment must not restore privileges after the role is revoked.
  if (profile.role !== "teacher") {
    return false;
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("course_instructors")
    .select("id, course_id, teacher_id")
    .eq("course_id", courseId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  return !assignmentError && !!assignment;
}
