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

  if (!enrollment) {
    return notFound();
  }

  const { data: courseLessons } = await supabase
    .from("sections")
    .select(`
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

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("is_completed")
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-right">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            {lesson.title}
          </h1>

          {lesson.duration && (
            <p className="text-sm text-slate-500 mb-4">
              المدة: {lesson.duration}
            </p>
          )}

          {lesson.content_url ? (
            <a
              href={lesson.content_url}
              target="_blank"
              className="inline-block px-5 py-3 bg-[#087a54] text-white rounded-xl font-bold"
            >
              فتح محتوى الدرس
            </a>
          ) : (
            <p className="text-sm text-slate-500">
              لا يوجد محتوى لهذا الدرس حاليًا.
            </p>
          )}

          <CompleteLessonButton
            enrollmentId={enrollment.id}
            lessonId={lesson.id}
            initialCompleted={progress?.is_completed ?? false}
          />

          <div className="flex justify-between mt-8">
            {previousLesson ? (
              <Link
                href={`/courses/${id}/lessons/${previousLesson.id}`}
                className="px-4 py-2 bg-slate-100 rounded-lg text-sm"
              >
                ⬅️ الدرس السابق
              </Link>
            ) : (
              <span />
            )}

            {nextLesson && (
              <Link
                href={`/courses/${id}/lessons/${nextLesson.id}`}
                className="px-4 py-2 bg-[#087a54] text-white rounded-lg text-sm"
              >
                الدرس التالي ➡️
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
