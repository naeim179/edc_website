import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentCourse = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  nextLessonId: string | null;
};

type RawLesson = {
  id: string;
  order_index?: number | null;
};

type RawSection = {
  order_index?: number | null;
  lessons?: RawLesson[] | null;
};

type RawCourse = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  sections?: RawSection[] | null;
};

type RawEnrollment = {
  id: string;
  course: RawCourse | RawCourse[] | null;
  lesson_progress?:
    | { lesson_id: string; is_completed: boolean }[]
    | null;
};

/** الدورات المسجل بها الطالب مع التقدم الحقيقي والدرس التالي */
export async function getStudentCourses(
  supabase: SupabaseServerClient,
  userId: string
): Promise<StudentCourse[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      course:courses (
        id,
        title,
        category,
        image_url,
        sections (
          order_index,
          lessons (
            id,
            order_index
          )
        )
      ),
      lesson_progress (
        lesson_id,
        is_completed
      )
    `)
    .eq("student_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load enrolled courses: ${error.message}`
    );
  }

  const rows = (data ?? []) as unknown as RawEnrollment[];

  return rows.flatMap((enrollment): StudentCourse[] => {
    const course = Array.isArray(enrollment.course)
      ? enrollment.course[0]
      : enrollment.course;

    if (!course) {
      return [];
    }

    const sections = [...(course.sections ?? [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const lessons = sections.flatMap((section) =>
      [...(section.lessons ?? [])].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      )
    );

    const completedIds = new Set(
      (enrollment.lesson_progress ?? [])
        .filter((item) => item.is_completed)
        .map((item) => item.lesson_id)
    );

    const totalLessons = lessons.length;

    const completedLessons = lessons.filter((lesson) =>
      completedIds.has(lesson.id)
    ).length;

    const nextLesson =
      lessons.find((lesson) => !completedIds.has(lesson.id)) ??
      null;

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
        nextLessonId: nextLesson?.id ?? null,
      },
    ];
  });
}

/** نفس الدالة لكن ما بتكسر الصفحة إذا فشل الاستعلام (للرئيسية وقائمة الدورات) */
export async function getStudentCoursesSafe(
  supabase: SupabaseServerClient,
  userId: string
): Promise<StudentCourse[]> {
  try {
    return await getStudentCourses(supabase, userId);
  } catch (error) {
    console.error(error);
    return [];
  }
}
