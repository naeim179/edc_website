import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import CourseDetailContent from "@/components/CourseDetailContent";
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
      <CourseDetailContent
        course={course}
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
