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
          duration,
          order_index
        )
      )
    `)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load course: ${error.message}`);
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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-slate-100 flex items-center justify-center text-slate-400">
              لا توجد صورة للدورة
            </div>
          )}

          <div className="p-6 text-right space-y-4">

            {course.category && (
              <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {course.category}
              </span>
            )}

            <h1 className="text-2xl font-bold text-slate-800">
              {course.title}
            </h1>


            <p className="text-sm text-slate-500">
              عدد الدروس: {totalLessons}
            </p>


            {course.is_free ? (
              <p className="text-green-600 font-bold">
                دورة مجانية
              </p>
            ) : (
              <p className="text-lg font-bold text-slate-700">
                السعر: {course.price} {course.currency}
              </p>
            )}


            {course.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
            )}


            {enrollmentId ? (
              <Link
                href={`/courses/${course.id}`}
                className="inline-block bg-slate-200 px-6 py-3 rounded-xl font-bold"
              >
                أنت مسجل بالدورة
              </Link>
            ) : course.is_free ? (
              <EnrollButton courseId={course.id} />
            ) : (
              <BuyCourseButton courseId={course.id} />
            )}

          </div>
        </div>


        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

          <h2 className="text-xl font-bold text-slate-800 mb-5">
            محتوى الدورة
          </h2>


          {sections.length > 0 ? (
            <div className="space-y-5">

              {sections.map((section) => {

                const lessons = [...(section.lessons ?? [])].sort(
                  (a,b)=>a.order_index-b.order_index
                );


                return (
                  <div
                    key={section.id}
                    className="border border-slate-100 rounded-xl p-4"
                  >

                    <h3 className="font-bold text-slate-700 mb-3">
                      {section.title}
                    </h3>


                    <div className="space-y-2">

                      {lessons.map((lesson)=>{

                        const completed =
                          completedLessonIds.includes(
                            lesson.id
                          );


                        if(!enrollmentId){
                          return (
                            <div
                              key={lesson.id}
                              className="flex justify-between bg-slate-50 rounded-lg px-4 py-3"
                            >
                              <span>
                                {lesson.title}
                              </span>

                              <span className="text-xs text-slate-400">
                                سجل أولاً
                              </span>
                            </div>
                          );
                        }


                        return (
                          <Link
                            key={lesson.id}
                            href={`/courses/${course.id}/lessons/${lesson.id}`}
                            className="flex justify-between bg-slate-50 rounded-lg px-4 py-3"
                          >
                            <span>
                              {completed ? "✅ " : "⬜ "}
                              {lesson.title}
                            </span>
                          </Link>
                        );

                      })}

                    </div>

                  </div>
                );

              })}

            </div>
          ) : (
            <p className="text-slate-500">
              لا يوجد محتوى
            </p>
          )}

        </section>

      </div>
    </AppShell>
  );
}
