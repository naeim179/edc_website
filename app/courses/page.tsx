import AppShell from "@/components/AppShell";
import CoursesContent from "@/components/CoursesContent";
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

  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      category,
      image_url,
      instructor_id,
      sections (
        id,
        lessons (
          id
        )
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load courses: ${error.message}`);
  }

  const mappedCourses =
    courses?.map((course) => {
      const lessonsCount =
        course.sections?.reduce(
          (total, section) => total + (section.lessons?.length ?? 0),
          0
        ) ?? 0;

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        image: course.image_url,
        lessons: lessonsCount,
        progress: 0,
      };
    }) ?? [];

  const filteredCourses = searchQuery
    ? mappedCourses.filter((course) => {
        const searchableText = [
          course.title,
          course.category ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchQuery);
      })
    : mappedCourses;

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
