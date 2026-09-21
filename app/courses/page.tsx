import AppShell from "@/components/AppShell";
import CoursesContent from "@/components/CoursesContent";
import { fetchCatalogCourses } from "@/lib/course-catalog";
import { getStudentCoursesSafe } from "@/lib/student-courses";
import { createClient } from "@/lib/supabase/server";

type CoursesPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CoursesPage({
  searchParams,
}: CoursesPageProps) {
  const { q } = await searchParams;
  const searchQuery = q?.trim().toLowerCase() ?? "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const studentCourses = user
    ? await getStudentCoursesSafe(supabase, user.id)
    : [];

  const courses = await fetchCatalogCourses(supabase, studentCourses);

  const filteredCourses = searchQuery
    ? courses.filter((course) =>
        [course.title, course.category ?? "", course.instructor ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery)
      )
    : courses;

  return (
    <AppShell>
      <CoursesContent
        courses={filteredCourses}
        searchQuery={searchQuery}
        searchText={q ?? ""}
      />
    </AppShell>
  );
}
