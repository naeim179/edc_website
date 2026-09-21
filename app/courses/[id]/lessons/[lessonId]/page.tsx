import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import LessonContent from "@/components/LessonContent";
import { getLessonMedia } from "@/lib/lesson-media";
import { createClient } from "@/lib/supabase/server";

type RawLesson = {
  id: string;
  title: string;
  duration: string | number | null;
  is_free_preview: boolean | null;
  section_id: string;
  course_id: string;
};

type RawSection = {
  id: string;
  title: string;
  order_index: number | null;
};

type RawCurriculumLesson = {
  id: string;
  section_id: string;
  title: string;
  order_index: number | null;
  is_free_preview: boolean | null;
};

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

  // بيانات الدرس من الـ view العام (بدون رابط المحتوى)
  const { data: lessonData, error } = await supabase
    .from("lessons_public")
    .select("id, title, duration, is_free_preview, section_id, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    // 22P02 = معرّف غير صالح (مش UUID)
    if (error.code === "22P02") {
      return notFound();
    }

    throw new Error(`Failed to load lesson: ${error.message}`);
  }

  const lesson = lessonData as unknown as RawLesson | null;

  // الدرس لازم يتبع نفس الدورة اللي بالرابط
  if (!lesson || lesson.course_id !== id) {
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let enrollmentId: string | null = null;

  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", id)
      .maybeSingle();

    enrollmentId = enrollment?.id ?? null;
  }

  if (!enrollmentId && !lesson.is_free_preview) {
    redirect(user ? `/courses/${id}` : "/login");
  }

  const [
    courseResult,
    sectionsResult,
    lessonsResult,
    progressResult,
    contentResult,
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("title")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("sections")
      .select("id, title, order_index")
      .eq("course_id", id),

    supabase
      .from("lessons_public")
      .select("id, section_id, title, order_index, is_free_preview")
      .eq("course_id", id),

    enrollmentId
      ? supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("enrollment_id", enrollmentId)
          .eq("is_completed", true)
      : Promise.resolve({ data: [] }),

    // رابط المحتوى بينقرأ من الجدول الأصلي، وقاعدة البيانات بترجعه
    // فقط للمسجّل أو لدرس المعاينة المجانية أو لطاقم الدورة
    supabase
      .from("lessons")
      .select("content_url")
      .eq("id", lessonId)
      .maybeSingle(),
  ]);

  if (contentResult.error) {
    throw new Error(
      `Failed to load lesson content: ${contentResult.error.message}`
    );
  }

  const contentUrl =
    (contentResult.data as { content_url: string | null } | null)
      ?.content_url ?? null;

  const courseTitle =
    (courseResult.data as { title: string } | null)?.title ?? "";

  const lessonRows = (lessonsResult.data ??
    []) as unknown as RawCurriculumLesson[];

  const sections = (
    (sectionsResult.data ?? []) as unknown as RawSection[]
  )
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((item) => ({
      id: item.id,
      title: item.title,
      lessons: lessonRows
        .filter((row) => row.section_id === item.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((row) => ({
          id: row.id,
          title: row.title,
          isFreePreview: Boolean(row.is_free_preview),
        })),
    }));

  const sectionTitle =
    sections.find((item) => item.id === lesson.section_id)?.title ?? "";

  const completedLessonIds = (
    (progressResult.data ?? []) as unknown as { lesson_id: string }[]
  ).map((row) => row.lesson_id);

  const isEnrolled = Boolean(enrollmentId);

  const allLessons = sections.flatMap((item) => item.lessons);

  // الزائر أو غير المسجل يتنقل بين دروس المعاينة المجانية فقط
  const navigable = isEnrolled
    ? allLessons
    : allLessons.filter((item) => item.isFreePreview);

  const currentIndex = navigable.findIndex(
    (item) => item.id === lesson.id
  );

  const previousLesson =
    currentIndex > 0 ? navigable[currentIndex - 1] : null;

  const nextLesson =
    currentIndex >= 0 && currentIndex < navigable.length - 1
      ? navigable[currentIndex + 1]
      : null;

  const position = {
    current:
      allLessons.findIndex((item) => item.id === lesson.id) + 1,
    total: allLessons.length,
  };

  return (
    <AppShell>
      <LessonContent
        courseId={id}
        courseTitle={courseTitle}
        lesson={{
          id: lesson.id,
          title: lesson.title,
          duration:
            lesson.duration !== null && lesson.duration !== undefined
              ? String(lesson.duration)
              : null,
          sectionTitle,
          isFreePreview: Boolean(lesson.is_free_preview),
          media: getLessonMedia(contentUrl),
        }}
        enrollmentId={enrollmentId}
        completed={completedLessonIds.includes(lesson.id)}
        sections={sections}
        completedLessonIds={completedLessonIds}
        previousLessonId={previousLesson?.id ?? null}
        nextLessonId={nextLesson?.id ?? null}
        position={position}
      />
    </AppShell>
  );
}
