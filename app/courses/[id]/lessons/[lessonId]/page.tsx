import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import LessonContent from "@/components/LessonContent";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionActive } from "@/lib/subscriptions";

type RawLesson = {
  id: string;
  title: string;
  duration: string | number | null;
  is_free_preview: boolean | null;
  section_id: string;
  course_id: string;
  video_provider: string | null;
  youtube_video_id: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  bunny_library_id: string | null;
  bunny_video_id: string | null;
  lesson_type: string | null;
  live_platform: string | null;
  live_schedule: string | null;
  content_url: string | null;
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

  // بيانات آمنة للدرس بدون content_url.
  const { data: lessonCatalog, error } = await supabase.rpc(
    "get_course_lesson_catalog",
    {
      p_course_id: id,
    }
  );

  const lessonData =
    ((lessonCatalog ?? []) as unknown as RawLesson[]).find(
      (item) => item.id === lessonId
    ) ?? null;

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
  let hasCourseAccess = false;

  const { data: courseAccess, error: courseAccessError } =
    await supabase
      .from("courses")
      .select("is_free")
      .eq("id", id)
      .maybeSingle();

  if (courseAccessError) {
    throw new Error(courseAccessError.message);
  }

  if (user) {
    const { data: enrollment, error: enrollmentError } =
      await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", id)
        .maybeSingle();

    if (enrollmentError) {
      throw new Error(enrollmentError.message);
    }

    enrollmentId = enrollment?.id ?? null;

    if (enrollmentId) {
      if (courseAccess?.is_free) {
        hasCourseAccess = true;
      } else {
        const { data: subscription, error: subscriptionError } =
          await supabase
            .from("subscriptions")
            .select("status, expires_at")
            .eq("student_id", user.id)
            .eq("course_id", id)
            .maybeSingle();

        if (subscriptionError) {
          throw new Error(subscriptionError.message);
        }

        hasCourseAccess =
          isSubscriptionActive(subscription);
      }
    }
  }

  if (!hasCourseAccess && !lesson.is_free_preview) {
    redirect(user ? `/courses/${id}` : "/login");
  }

  const [
    courseResult,
    sectionsResult,
    lessonsResult,
    progressResult,
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

    supabase.rpc(
      "get_course_lesson_catalog",
      {
        p_course_id: id,
      }
    ),

    enrollmentId
      ? supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("enrollment_id", enrollmentId)
          .eq("is_completed", true)
      : Promise.resolve({ data: [] }),


  ]);


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

  const isEnrolled = hasCourseAccess;

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
          video_provider: lesson.video_provider,
          youtube_video_id: lesson.youtube_video_id,
          mux_playback_id: lesson.mux_playback_id,
          bunny_library_id: lesson.bunny_library_id,
          bunny_video_id: lesson.bunny_video_id,
          lesson_type: lesson.lesson_type,
          live_platform: lesson.live_platform,
          live_schedule: lesson.live_schedule,
          content_url: lesson.content_url,
        }}
        enrollmentId={hasCourseAccess ? enrollmentId : null}
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
