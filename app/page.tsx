import Link from "next/link";
import AppShell from "@/components/AppShell";
import HeroBanner from "@/components/HeroBanner";
import CourseCard from "@/components/CourseCard";
import ProgressCard from "@/components/ProgressCard";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      category,
      image_url,
      sections (
        lessons (
          id
        )
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Failed to load courses: ${error.message}`);
  }

  const mappedCourses =
    courses?.map((course) => {
      const lessonsCount =
        course.sections?.reduce(
          (total, section) =>
            total + (section.lessons?.length ?? 0),
          0
        ) ?? 0;

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        image: course.image_url,
        lessons: lessonsCount,
      };
    }) ?? [];

  return (
    <AppShell>
      <HeroBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              الدورات المتاحة
            </h3>

            <Link
              href="/courses"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              عرض جميع الدورات
            </Link>
          </div>

          <div className="space-y-3">
            {mappedCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                category={course.category ?? "عام"}
                progress={0}
                completedLessons={0}
                totalLessons={course.lessons}
                image={course.image}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            نظرة عامة
          </h3>

          <ProgressCard />
        </div>
      </div>
    </AppShell>
  );
}
