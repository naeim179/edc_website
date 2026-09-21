import AppShell from "@/components/AppShell";
import MyCoursesContent from "@/components/MyCoursesContent";
import { getStudentCourses } from "@/lib/student-courses";
import { createClient } from "@/lib/supabase/server";

export default async function MyCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell>
        <MyCoursesContent courses={[]} isAuthenticated={false} />
      </AppShell>
    );
  }

  const courses = await getStudentCourses(supabase, user.id);

  return (
    <AppShell>
      <MyCoursesContent courses={courses} isAuthenticated={true} />
    </AppShell>
  );
}
