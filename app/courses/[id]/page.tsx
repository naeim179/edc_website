import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import CourseDetailContent from "@/components/CourseDetailContent";
import { createClient } from "@/lib/supabase/server";

type CurriculumLesson = {
  id: string;
  section_id: string;
  title: string;
  order_index: number;
  is_free_preview: boolean;
};

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
      discount_type,
      discount_value,
      course_type,

      course_instructors (
        teacher:profiles (
          id,
          full_name,
          teacher_profiles (
            image_url,
            bio,
            specialization,
            experience_years
          )
        )
      ),

      sections (
        id,
        title,
        order_index
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

  // قائمة الدروس من الـ view العام (بدون روابط المحتوى) عشان الزائر يشوف المنهج كامل
  const { data: lessonRows, error: lessonsError } = await supabase
    .from("lessons_public")
    .select("id, section_id, title, order_index, is_free_preview")
    .eq("course_id", id);

  if (lessonsError) {
    throw new Error(
      `Failed to load lessons: ${lessonsError.message}`
    );
  }

  const lessonsBySection = new Map<string, CurriculumLesson[]>();

  for (const row of (lessonRows ?? []) as unknown as CurriculumLesson[]) {
    const list = lessonsBySection.get(row.section_id) ?? [];
    list.push(row);
    lessonsBySection.set(row.section_id, list);
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

  const sections = [...(course.sections ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      ...section,
      lessons: [...(lessonsBySection.get(section.id) ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      ),
    }));

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
      <CourseDetailContent
        course={{ ...course, sections }}
        sections={sections}
        enrollmentId={enrollmentId}
        completedLessonIds={completedLessonIds}
        totalLessons={totalLessons}
        completedLessons={completedLessons}
        progressPercent={progressPercent}
      />
    </AppShell>
  );
}
