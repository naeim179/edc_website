import AppShell from "@/components/AppShell";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import { courses } from "./lib/mock-courses";

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

  const filteredCourses = searchQuery
    ? courses.filter((course) => {
        const searchableText = [
          course.title,
          course.instructor,
          course.category ?? "",
          course.description ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchQuery);
      })
    : courses;

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
                instructor={course.instructor}
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
              لا توجد نتائج
            </h2>

            <p className="text-sm text-slate-500">
              جرّب البحث باسم دورة أو تصنيف أو مدرب آخر.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
