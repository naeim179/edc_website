import { createClient } from "@/lib/supabase/server";

export async function canManageCourse(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    return false;
  }


  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();



  if (profile?.role === "admin") {
    return true;
  }


  const { data: assignment } = await supabase
    .from("course_instructors")
    .select("id, course_id, teacher_id")
    .eq("course_id", courseId)
    .eq("teacher_id", user.id)
    .maybeSingle();



  return !!assignment;
}
