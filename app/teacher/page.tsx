import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TeacherDashboardContent from "@/components/TeacherDashboardContent";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getTeacherCourses, type TeacherCourse } from "@/lib/teacher-courses";

export default async function TeacherPage() {
  await requireTeacher();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let courses: TeacherCourse[] = [];

  try {
    courses = await getTeacherCourses(
      supabase,
      user.id
    );
  } catch {
    courses = [];
  }

  return (
    <AppShell>
      <TeacherDashboardContent courses={courses} />
    </AppShell>
  );
}
