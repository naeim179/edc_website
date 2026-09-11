import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import { createClient } from "@/lib/supabase/server";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      category,
      image_url,
      price,
      currency,
      is_free,
      sections (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          content_url,
          order_index,
          is_free_preview
        )
      )
    `)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load course: ${error.message}`
    );
  }

  if (!course) {
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let enrollmentId: string | null = null;
  let completedLessonIds: string[] = [];

  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", id)
      .maybeSingle();

    if (enrollment) {
      enrollmentId = enrollment.id;

      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("enrollment_id", enrollment.id)
        .eq("is_completed", true);

      completedLessonIds =
        progress?.map((item) => item.lesson_id) ?? [];
    }
  }

  const sections = [...(course.sections ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const totalLessons = sections.reduce(
    (total, section) =>
      total + (section.lessons?.length ?? 0),
    0
  );

  const completedLessons =
    completedLessonIds.length;

  const progressPercent =
    totalLessons > 0
      ? Math.round(
          (completedLessons / totalLessons) * 100
        )
      : 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full space-y-7">

        <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">

          <div className="grid md:grid-cols-2">

            <div className="p-7 md:p-9 text-right flex flex-col justify-center">

              {course.category && (
                <span className="self-end inline-flex items-center rounded-full bg-blue-50 text-[#124b8a] px-3 py-1 text-xs font-bold mb-4">
                  {course.category}
                </span>
              )}

              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="mt-4 text-slate-500 leading-7">
                  {course.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-6">

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">
                    عدد الدروس
                  </p>

                  <p className="text-lg font-bold text-slate-800">
                    📚 {totalLessons}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">
                    السعر
                  </p>

                  <p className="text-lg font-bold text-slate-800">
                    {course.is_free
                      ? "مجانية"
                      : `${course.price ?? 0} ${
                          course.currency ?? "JOD"
                        }`}
                  </p>
                </div>

              </div>

              {enrollmentId && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-bold text-[#124b8a]">
                      {progressPercent}%
                    </span>

                    <span className="text-slate-500">
                      {completedLessons} من {totalLessons} مكتمل
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#124b8a] rounded-full"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6">

                {enrollmentId ? (
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-[#124b8a] px-5 py-3 rounded-xl font-bold">
                    ✓ أنت مسجل بالدورة
                  </div>
                ) : course.is_free ? (
                  <EnrollButton courseId={course.id} />
                ) : (
                  <BuyCourseButton courseId={course.id} />
                )}

              </div>

            </div>


            <div className="bg-[#eef4fb] min-h-[280px] flex items-center justify-center overflow-hidden">

              {course.image_url ? (
                <img
                  src={course.image_url}
                  alt={course.title}
                  className="w-full h-full min-h-[280px] object-cover"
                />
              ) : (
                <div className="text-center text-[#124b8a]/60 px-6">
                  <div className="text-5xl mb-3">
                    📚
                  </div>

                  <p className="font-bold">
                    لا توجد صورة للدورة
                  </p>
                </div>
              )}

            </div>

          </div>

        </section>


        <section
          dir="rtl"
          className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 md:p-8"
        >

          <div className="flex flex-row-reverse items-center justify-between mb-6">

            <div className="text-sm text-slate-400">
              {sections.length} أقسام
            </div>

            <div className="text-right">
              <p className="text-xs text-[#124b8a] font-bold mb-1">
                COURSE CONTENT
              </p>

              <h2 className="text-2xl font-bold text-slate-900">
                محتوى الدورة
              </h2>
            </div>

          </div>


          {sections.length > 0 ? (
            <div className="space-y-4">

              {sections.map((section, sectionIndex) => {
                const lessons = [
                  ...(section.lessons ?? []),
                ].sort(
                  (a, b) =>
                    a.order_index - b.order_index
                );

                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden"
                  >

                    <div className="bg-slate-50 px-5 py-4 flex items-center justify-between">

                      <span className="text-xs font-bold text-[#124b8a] bg-blue-50 rounded-full px-3 py-1">
                        {lessons.length} درس
                      </span>

                      <div className="text-right">
                        <p className="text-xs text-slate-400 mb-1">
                          القسم {sectionIndex + 1}
                        </p>

                        <h3 className="font-bold text-slate-800">
                          {section.title}
                        </h3>
                      </div>

                    </div>


                    <div className="p-3 space-y-2">

                      {lessons.length > 0 ? (
                        lessons.map((lesson) => {
                          const completed =
                            completedLessonIds.includes(
                              lesson.id
                            );

                          if (!enrollmentId) {
                            if (lesson.is_free_preview) {
                              return (
                                <Link
                                  key={lesson.id}
                                  href={`/courses/${course.id}/lessons/${lesson.id}`}
                                  className="flex items-center justify-between rounded-xl bg-emerald-50 hover:bg-emerald-100 px-4 py-3 transition"
                                >
                                  <span className="text-xs font-bold text-[#087a54] bg-white px-3 py-1 rounded-full">
                                    معاينة مجانية
                                  </span>

                                  <span className="font-medium text-slate-700">
                                    🎬 {lesson.title}
                                  </span>
                                </Link>
                              );
                            }

                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                              >
                                <span className="text-xs text-slate-400">
                                  {course.is_free
                                    ? "متاح بعد التسجيل"
                                    : "متاح بعد الشراء"}
                                </span>

                                <span className="font-medium text-slate-500">
                                  🔒 {lesson.title}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={lesson.id}
                              href={`/courses/${course.id}/lessons/${lesson.id}`}
                              className="flex items-center justify-between rounded-xl bg-slate-50 hover:bg-blue-50 px-4 py-3 transition"
                            >

                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full ${
                                  completed
                                    ? "bg-emerald-50 text-[#087a54]"
                                    : "bg-blue-50 text-[#124b8a]"
                                }`}
                              >
                                {completed
                                  ? "مكتمل"
                                  : "ابدأ الدرس"}
                              </span>

                              <span className="font-medium text-slate-700">
                                {completed
                                  ? "✅ "
                                  : "▶️ "}
                                {lesson.title}
                              </span>

                            </Link>
                          );
                        })
                      ) : (
                        <div className="text-center text-sm text-slate-400 py-6">
                          لا توجد دروس في هذا القسم.
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center">
              <div className="text-4xl mb-3">
                📚
              </div>

              <p className="text-slate-500">
                لا يوجد محتوى للدورة حاليًا.
              </p>
            </div>
          )}

        </section>

      </div>
    </AppShell>
  );
}
