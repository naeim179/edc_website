import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient =
  Awaited<
    ReturnType<typeof createClient>
  >;

export type StudentCourse = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;

  totalLessons: number;
  completedLessons: number;
  progress: number;
  nextLessonId: string | null;

  isFree: boolean;
  accessActive: boolean;

  expiresAt: string | null;
  daysRemaining: number | null;
  autoRenew: boolean;
};

type RawLesson = {
  id: string;
  order_index?: number | null;
  section_order_index?: number | null;
};

type RawCourse = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  is_free: boolean | null;
};

type RawEnrollment = {
  id: string;

  course:
    | RawCourse
    | RawCourse[]
    | null;

  lesson_progress?:
    | {
        lesson_id: string;
        is_completed: boolean;
      }[]
    | null;
};

type RawSubscription = {
  course_id: string;
  status: string;
  expires_at: string | null;
  auto_renew: boolean;
  duration_months: number;
};

export async function getStudentCourses(
  supabase: SupabaseServerClient,
  userId: string
): Promise<StudentCourse[]> {
  const {
    data,
    error,
  } = await supabase
    .from("enrollments")
    .select(`
      id,

      course:courses (
        id,
        title,
        category,
        image_url,
        is_free
      ),

      lesson_progress (
        lesson_id,
        is_completed
      )
    `)
    .eq("student_id", userId)
    .order(
      "enrolled_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      `Failed to load enrolled courses: ${error.message}`
    );
  }

  const {
    data: subscriptionRows,
    error: subscriptionError,
  } = await supabase
    .from("subscriptions")
    .select(`
      course_id,
      status,
      expires_at,
      auto_renew,
      duration_months
    `)
    .eq("student_id", userId);

  if (subscriptionError) {
    throw new Error(
      `Failed to load subscriptions: ${subscriptionError.message}`
    );
  }

  const subscriptions =
    (
      subscriptionRows ??
      []
    ) as unknown as RawSubscription[];

  const rows =
    (
      data ??
      []
    ) as unknown as RawEnrollment[];

  const now =
    Date.now();

  const result =
    await Promise.all(
      rows.map(
        async (
          enrollment
        ): Promise<
          StudentCourse | null
        > => {
          const course =
            Array.isArray(
              enrollment.course
            )
              ? enrollment
                  .course[0]
              : enrollment.course;

          if (!course) {
            return null;
          }

          const {
            data: lessonRows,
            error: lessonsError,
          } = await supabase.rpc(
            "get_course_lesson_catalog",
            {
              p_course_id:
                course.id,
            }
          );

          if (lessonsError) {
            throw new Error(
              `Failed to load course lessons: ${lessonsError.message}`
            );
          }

          const lessons =
            (
              lessonRows ??
              []
            ) as unknown as RawLesson[];

          lessons.sort(
            (a, b) => {
              const sectionDiff =
                (
                  a.section_order_index ??
                  0
                ) -
                (
                  b.section_order_index ??
                  0
                );

              if (
                sectionDiff !==
                0
              ) {
                return sectionDiff;
              }

              return (
                (
                  a.order_index ??
                  0
                ) -
                (
                  b.order_index ??
                  0
                )
              );
            }
          );

          const completedIds =
            new Set(
              (
                enrollment.lesson_progress ??
                []
              )
                .filter(
                  (item) =>
                    item.is_completed
                )
                .map(
                  (item) =>
                    item.lesson_id
                )
            );

          const totalLessons =
            lessons.length;

          const completedLessons =
            lessons.filter(
              (lesson) =>
                completedIds.has(
                  lesson.id
                )
            ).length;

          const nextLesson =
            lessons.find(
              (lesson) =>
                !completedIds.has(
                  lesson.id
                )
            ) ?? null;

          const progress =
            totalLessons > 0
              ? Math.round(
                  (
                    completedLessons /
                    totalLessons
                  ) *
                    100
                )
              : 0;

          const subscription =
            subscriptions.find(
              (item) =>
                item.course_id ===
                course.id
            ) ?? null;

          const expiresAt =
            subscription
              ?.expires_at ??
            null;

          const subscriptionActive =
            Boolean(
              subscription &&
                subscription.status ===
                  "active" &&
                (
                  !expiresAt ||
                  new Date(
                    expiresAt
                  ).getTime() >
                    now
                )
            );

          const accessActive =
            Boolean(
              course.is_free
            ) ||
            subscriptionActive;

          const daysRemaining =
            expiresAt
              ? Math.max(
                  0,
                  Math.ceil(
                    (
                      new Date(
                        expiresAt
                      ).getTime() -
                      now
                    ) /
                      (
                        1000 *
                        60 *
                        60 *
                        24
                      )
                  )
                )
              : null;

          return {
            id: course.id,
            title:
              course.title,
            category:
              course.category,
            image:
              course.image_url,

            totalLessons,
            completedLessons,
            progress,

            nextLessonId:
              nextLesson?.id ??
              null,

            isFree:
              Boolean(
                course.is_free
              ),

            accessActive,

            expiresAt,

            daysRemaining,

            autoRenew:
              Boolean(
                subscription
                  ?.auto_renew
              ),
          };
        }
      )
    );

  return result.filter(
    (
      item
    ): item is StudentCourse =>
      Boolean(item)
  );
}

export async function getStudentCoursesSafe(
  supabase: SupabaseServerClient,
  userId: string
): Promise<StudentCourse[]> {
  try {
    return await getStudentCourses(
      supabase,
      userId
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}
