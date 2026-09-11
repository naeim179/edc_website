import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CompleteLessonButton from "@/components/CompleteLessonButton";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({
  params,
}: {
  params: Promise<{
    id: string;
    lessonId: string;
  }>;
}) {
  const { id, lessonId } = await params;

  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(`
      id,
      title,
      content_url,
      duration,
      order_index,
      is_free_preview,
      section:sections (
        id,
        title,
        order_index,
        course_id
      )
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load lesson: ${error.message}`);
  }

  if (!lesson) {
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return notFound();
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", id)
    .maybeSingle();

  if (!enrollment && !lesson.is_free_preview) {
    return notFound();
  }

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { data: courseLessons } = await supabase
    .from("sections")
    .select(`
      id,
      title,
      order_index,
      lessons (
        id,
        title,
        order_index
      )
    `)
    .eq("course_id", id);

  const allLessons =
    courseLessons
      ?.sort((a, b) => a.order_index - b.order_index)
      .flatMap((section) =>
        (section.lessons ?? [])
          .sort((a, b) => a.order_index - b.order_index)
      ) ?? [];

  const currentIndex = allLessons.findIndex(
    (item) => item.id === lesson.id
  );

  const previousLesson =
    currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  const nextLesson =
    currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  const youtubeId = lesson.content_url
    ?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/
    )?.[1];

  const { data: progress } = enrollment
    ? await supabase
        .from("lesson_progress")
        .select("is_completed")
        .eq("enrollment_id", enrollment.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  return (
    <AppShell>
      <div
        className="max-w-5xl mx-auto w-full space-y-6"
        dir="rtl"
      >

        <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">

          <Link
            href={`/courses/${id}`}
            className="text-sm text-[#124b8a] font-bold"
          >
            العودة إلى محتوى الدورة
          </Link>


          <div className="mt-5 space-y-3">

            <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-[#124b8a] text-xs font-bold">
              {lesson.section?.[0]?.title}
            </span>


            <h1 className="text-3xl font-bold text-slate-900">
              {lesson.title}
            </h1>


            <p className="text-slate-500">
              الدورة: {course?.title}
            </p>


            {lesson.duration && (
              <span className="inline-flex bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-sm text-slate-500">
                ⏱ {lesson.duration}
              </span>
            )}

          </div>


          <div className="mt-8">

            {lesson.content_url ? (
              lesson.content_url.includes("youtube.com") ||
              lesson.content_url.includes("youtu.be") ? (
                <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title={lesson.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={lesson.content_url}
                  target="_blank"
                  className="inline-flex px-6 py-3 bg-[#124b8a] text-white rounded-xl font-bold"
                >
                  فتح محتوى الدرس
                </a>
              )
            ) : (
              <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-500">
                لا يوجد محتوى لهذا الدرس حالياً.
              </div>
            )}

          </div>


          {enrollment && (
            <CompleteLessonButton
              enrollmentId={enrollment.id}
              lessonId={lesson.id}
              initialCompleted={
                progress?.is_completed ?? false
              }
            />
          )}


          <div className="flex items-center justify-between mt-10">

            {previousLesson ? (
              <Link
                href={`/courses/${id}/lessons/${previousLesson.id}`}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition"
              >
                الدرس السابق
              </Link>
            ) : (
              <span />
            )}


            {nextLesson && (
              <Link
                href={`/courses/${id}/lessons/${nextLesson.id}`}
                className="px-5 py-3 bg-[#124b8a] hover:bg-[#0d3b6e] text-white rounded-xl font-bold transition"
              >
                الدرس التالي
              </Link>
            )}

          </div>

        </section>

      </div>
    </AppShell>
  );
}
