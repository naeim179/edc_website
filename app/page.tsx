import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import HomeContent from "@/components/HomeContent";
import { fetchCatalogCourses } from "@/lib/course-catalog";
import {
  getStudentCoursesSafe,
  type StudentCourse,
} from "@/lib/student-courses";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let studentCourses: StudentCourse[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? null;

    if (role === "admin") {
      redirect("/admin");
    }

    if (role === "teacher") {
      redirect("/teacher/courses");
    }

    displayName =
      profile?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      "";

    studentCourses = await getStudentCoursesSafe(supabase, user.id);
  }

  const courses = await fetchCatalogCourses(
    supabase,
    studentCourses,
    { limit: 6 }
  );

  // أول دورة قيد التعلم، وإلا أول دورة لم تبدأ بعد
  const continueCourse =
    studentCourses.find(
      (course) => course.progress > 0 && course.progress < 100
    ) ??
    studentCourses.find((course) => course.progress < 100) ??
    null;

  const stats = {
    enrolled: studentCourses.length,
    completedLessons: studentCourses.reduce(
      (total, course) => total + course.completedLessons,
      0
    ),
    completedCourses: studentCourses.filter(
      (course) => course.totalLessons > 0 && course.progress >= 100
    ).length,
  };

  return (
    <AppShell>
      <HomeContent
        isAuthenticated={Boolean(user)}
        displayName={displayName}
        stats={stats}
        continueCourse={continueCourse}
        courses={courses}
      />
    </AppShell>
  );
}
