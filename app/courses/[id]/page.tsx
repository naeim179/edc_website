import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
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

  const sections = [...(course.sections ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const totalLessons = sections.reduce(
    (total, section) => total + (section.lessons?.length ?? 0),
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

            {course.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
            )}

            <button className="mt-4 px-6 py-3 bg-[#087a54] hover:bg-[#066b49] text-white font-bold rounded-xl transition-all">
              التسجيل في الدورة
            </button>
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
                  (a, b) => a.order_index - b.order_index
                );

                return (
                  <div
                    key={section.id}
                    className="border border-slate-100 rounded-xl p-4"
                  >
                    <h3 className="font-bold text-slate-700 mb-3">
                      {section.title}
                    </h3>

                    {lessons.length > 0 ? (
                      <div className="space-y-2">
                        {lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3"
                          >
                            <span className="text-sm text-slate-700">
                              {lesson.title}
                            </span>

                            {lesson.duration && (
                              <span className="text-xs text-slate-400 shrink-0">
                                {lesson.duration}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        لا توجد دروس في هذا القسم حاليًا.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              لا يوجد محتوى منشور لهذه الدورة حاليًا.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
