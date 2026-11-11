import AppShell from "@/components/AppShell";
import CoursesContent from "@/components/CoursesContent";
import { catalogItems, loadCoursePage } from "@/lib/course-pages";
import { listFilters, type SearchValues } from "@/lib/list-pages";
import { getStudentCoursesSafe } from "@/lib/student-courses";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const filters = listFilters(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [data, mine] = await Promise.all([
    loadCoursePage(supabase, filters),
    user ? getStudentCoursesSafe(supabase, user.id) : Promise.resolve([]),
  ]);
  return (
    <AppShell>
      <CoursesContent
        courses={catalogItems(data, mine)}
        categories={data.categories}
        filters={filters}
        pageInfo={data}
      />
    </AppShell>
  );
}
