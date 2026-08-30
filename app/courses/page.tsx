import AppShell from "@/components/AppShell";
import CourseCatalogCard from "@/components/CourseCatalogCard";
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
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            جميع الدورات
          </h1>

          {searchQuery && (
            <p className="text-sm text-slate-500 mt-2">
              نتائج البحث عن: {q}
            </p>
          )}
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <CourseCatalogCard
                key={course.id}
                id={course.id}
                title={course.title}
                category={course.category}
                lessons={course.lessons}
                progress={course.progress}
                image={course.image}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-700 mb-2">
              لا توجد دورات
            </h2>

            <p className="text-sm text-slate-500">
              {searchQuery
                ? "لم نجد دورات مطابقة لعملية البحث."
                : "لا توجد دورات منشورة حاليًا."}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
