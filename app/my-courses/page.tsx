import Link from "next/link";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { createClient } from "@/lib/supabase/server";

export default async function MyCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">
            موادي
          </h1>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-700 mb-2">
              سجّل دخولك لعرض دوراتك
            </h2>

            <p className="text-sm text-slate-500 mb-5">
              بعد تسجيل الدخول ستظهر هنا الدورات المسجل بها ونسبة تقدمك.
            </p>

            <Link
              href="/login"
              className="inline-block px-5 py-2.5 bg-[#087a54] hover:bg-[#066b49] text-white text-sm font-bold rounded-xl transition-all"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      course:courses (
        id,
        title,
        category,
        image_url,
        sections (
          lessons (
            id
          )
        )
      ),
      lesson_progress (
        lesson_id,
        is_completed
      )
    `)
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load enrolled courses: ${error.message}`);
  }

  const courses =
    enrollments?.flatMap((enrollment) => {
      const course = Array.isArray(enrollment.course)
        ? enrollment.course[0]
        : enrollment.course;

      if (!course) {
        return [];
      }

      const totalLessons =
        course.sections?.reduce(
          (
            total: number,
            section: {
              lessons?: { id: string }[] | null;
            }
          ) => total + (section.lessons?.length ?? 0),
          0
        ) ?? 0;

      const completedLessons =
        enrollment.lesson_progress?.filter(
          (lesson) => lesson.is_completed
        ).length ?? 0;

      const progress =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      return [
        {
          id: course.id,
          title: course.title,
          category: course.category,
          image: course.image_url,
          totalLessons,
          completedLessons,
          progress,
        },
      ];
    }) ?? [];

  console.log(JSON.stringify(courses, null, 2));

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          موادي
        </h1>

        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                category={course.category}
                progress={course.progress}
                completedLessons={course.completedLessons}
                totalLessons={course.totalLessons}
                image={course.image}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-700 mb-2">
              لا توجد دورات مسجلة
            </h2>

            <p className="text-sm text-slate-500 mb-5">
              عندما تسجل في دورة ستظهر هنا.
            </p>

            <Link
              href="/courses"
              className="inline-block px-5 py-2.5 bg-[#087a54] hover:bg-[#066b49] text-white text-sm font-bold rounded-xl transition-all"
            >
              استعرض الدورات
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
