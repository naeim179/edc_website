import { notFound } from "next/navigation";

import AppShell from "@/components/AppShell";
import CourseDetailContent from "@/components/CourseDetailContent";

import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining, isSubscriptionActive } from "@/lib/subscriptions";

type CurriculumLesson = {
  id: string;
  section_id: string;
  title: string;
  order_index: number;
  is_free_preview: boolean;
};

type SubscriptionRow = {
  status: string;
  expires_at: string | null;
  auto_renew: boolean;
  duration_months: number;
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: course,
    error,
  } = await supabase
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
    .eq(
      "is_published",
      true
    )
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
    data: lessonRows,
    error: lessonsError,
  } = await supabase.rpc(
    "get_course_lesson_catalog",
    {
      p_course_id: id,
    }
  );

  if (lessonsError) {
    throw new Error(
      `Failed to load lessons: ${lessonsError.message}`
    );
  }

  const lessonsBySection =
    new Map<
      string,
      CurriculumLesson[]
    >();

  for (
    const row of (
      lessonRows ??
      []
    ) as unknown as CurriculumLesson[]
  ) {
    const list =
      lessonsBySection.get(
        row.section_id
      ) ?? [];

    list.push(row);

    lessonsBySection.set(
      row.section_id,
      list
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let enrollmentId:
    string | null = null;

  let completedLessonIds:
    string[] = [];

  let subscription:
    SubscriptionRow | null =
    null;

  if (user) {
    const {
      data: enrollment,
      error:
        enrollmentError,
    } = await supabase
      .from("enrollments")
      .select("id")
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "course_id",
        id
      )
      .maybeSingle();

    if (enrollmentError) {
      throw new Error(
        enrollmentError.message
      );
    }

    if (enrollment) {
      enrollmentId =
        enrollment.id;

      const {
        data: progress,
        error:
          progressError,
      } = await supabase
        .from(
          "lesson_progress"
        )
        .select("lesson_id")
        .eq(
          "enrollment_id",
          enrollment.id
        )
        .eq(
          "is_completed",
          true
        );

      if (progressError) {
        throw new Error(
          progressError.message
        );
      }

      completedLessonIds =
        progress?.map(
          (item) =>
            item.lesson_id
        ) ?? [];

      if (!course.is_free) {
        const {
          data:
            subscriptionData,
          error:
            subscriptionError,
        } = await supabase
          .from(
            "subscriptions"
          )
          .select(`
            status,
            expires_at,
            auto_renew,
            duration_months
          `)
          .eq(
            "student_id",
            user.id
          )
          .eq(
            "course_id",
            id
          )
          .maybeSingle();

        if (
          subscriptionError
        ) {
          throw new Error(
            subscriptionError.message
          );
        }

        subscription =
          subscriptionData as
            | SubscriptionRow
            | null;
      }
    }
  }

  const subscriptionActive =
    isSubscriptionActive(
      subscription
    );

  const hasCourseAccess =
    Boolean(enrollmentId) &&
    (
      Boolean(
        course.is_free
      ) ||
      subscriptionActive
    );

  const sections =
    [
      ...(course.sections ??
        []),
    ]
      .sort(
        (a, b) =>
          a.order_index -
          b.order_index
      )
      .map(
        (section) => ({
          ...section,

          lessons: [
            ...(
              lessonsBySection.get(
                section.id
              ) ?? []
            ),
          ].sort(
            (a, b) =>
              a.order_index -
              b.order_index
          ),
        })
      );

  const totalLessons =
    sections.reduce(
      (
        total,
        section
      ) =>
        total +
        (
          section.lessons
            ?.length ??
          0
        ),
      0
    );

  const completedLessons =
    completedLessonIds.length;

  const progressPercent =
    totalLessons > 0
      ? Math.round(
          (
            completedLessons /
            totalLessons
          ) *
            100
        )
      : 0;

  return (
    <AppShell>
      <CourseDetailContent
        course={{
          ...course,
          sections,
        }}
        sections={
          sections
        }
        enrollmentId={
          enrollmentId
        }
        hasCourseAccess={
          hasCourseAccess
        }
        subscription={
          subscription
            ? {
                expiresAt:
                  subscription.expires_at,

                autoRenew:
                  subscription.auto_renew,

                durationMonths:
                  subscription.duration_months,

                active:
                  subscriptionActive,

                daysRemaining:
                  getDaysRemaining(
                    subscription.expires_at
                  ),
              }
            : null
        }
        completedLessonIds={
          completedLessonIds
        }
        totalLessons={
          totalLessons
        }
        completedLessons={
          completedLessons
        }
        progressPercent={
          progressPercent
        }
      />
    </AppShell>
  );
}
