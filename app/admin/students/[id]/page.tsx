import { notFound } from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminStudentDetailContent from "@/components/AdminStudentDetailContent";
import { requirePermission } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("manage_students");

  const { id } = await params;
  const admin = createAdminClient();

  const [
    studentResult,
    authUserResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        created_at,
        role
      `)
      .eq("id", id)
      .eq("role", "student")
      .maybeSingle(),

    admin.auth.admin.getUserById(id),
  ]);

  if (studentResult.error) {
    throw new Error(
      studentResult.error.message
    );
  }

  if (!studentResult.data) {
    notFound();
  }

  if (authUserResult.error) {
    throw new Error(
      authUserResult.error.message
    );
  }

  const student =
    studentResult.data;

  const {
    data: enrollments,
    error: enrollmentError,
  } = await admin
    .from("enrollments")
    .select(`
      id,
      course_id,
      enrolled_at,
      lesson_progress (
        id,
        is_completed
      )
    `)
    .eq("student_id", id)
    .order("enrolled_at", {
      ascending: false,
    });

  if (enrollmentError) {
    throw new Error(
      enrollmentError.message
    );
  }

  const courseIds = [
    ...new Set(
      (
        enrollments ?? []
      ).map(
        (enrollment) =>
          enrollment.course_id
      )
    ),
  ];

  const [
    coursesResult,
    subscriptionsResult,
    sectionsResult,
  ] =
    courseIds.length > 0
      ? await Promise.all([
          admin
            .from("courses")
            .select(`
              id,
              title,
              is_free
            `)
            .in(
              "id",
              courseIds
            ),

          admin
            .from("subscriptions")
            .select(`
              course_id,
              expires_at,
              status,
              starts_at,
              duration_months,
              auto_renew,
              amount,
              currency
            `)
            .eq(
              "student_id",
              id
            )
            .in(
              "course_id",
              courseIds
            ),

          admin
            .from("sections")
            .select(`
              course_id,
              lessons (
                id
              )
            `)
            .in(
              "course_id",
              courseIds
            ),
        ])
      : [
          {
            data: [],
            error: null,
          },
          {
            data: [],
            error: null,
          },
          {
            data: [],
            error: null,
          },
        ];

  if (coursesResult.error) {
    throw new Error(
      coursesResult.error.message
    );
  }

  if (subscriptionsResult.error) {
    throw new Error(
      subscriptionsResult.error.message
    );
  }

  if (sectionsResult.error) {
    throw new Error(
      sectionsResult.error.message
    );
  }

  const courseById =
    new Map(
      (
        coursesResult.data ??
        []
      ).map(
        (course) => [
          course.id,
          course,
        ]
      )
    );

  const subscriptionByCourse =
    new Map(
      (
        subscriptionsResult.data ??
        []
      ).map(
        (subscription) => [
          subscription.course_id,
          subscription,
        ]
      )
    );

  const totalLessonsByCourse =
    new Map<string, number>();

  for (
    const section of
    sectionsResult.data ?? []
  ) {
    const current =
      totalLessonsByCourse.get(
        section.course_id
      ) ?? 0;

    totalLessonsByCourse.set(
      section.course_id,
      current +
        (
          section.lessons ??
          []
        ).length
    );
  }

  const enrollmentsData =
    (
      enrollments ??
      []
    ).map(
      (enrollment) => {
        const course =
          courseById.get(
            enrollment.course_id
          );

        const subscription =
          subscriptionByCourse.get(
            enrollment.course_id
          );

        const completedLessons =
          (
            enrollment.lesson_progress ??
            []
          ).filter(
            (item) =>
              item.is_completed
          ).length;

        return {
          id:
            enrollment.id,

          courseId:
            enrollment.course_id,

          courseTitle:
            course?.title ??
            null,

          isFree:
            Boolean(
              course?.is_free
            ),

          enrolledAt:
            enrollment.enrolled_at,

          completedLessons,

          totalLessons:
            totalLessonsByCourse.get(
              enrollment.course_id
            ) ?? 0,

          subscription:
            subscription
              ? {
                  expiresAt:
                    subscription.expires_at,

                  status:
                    subscription.status,

                  startsAt:
                    subscription.starts_at,

                  durationMonths:
                    subscription.duration_months,

                  autoRenew:
                    subscription.auto_renew,

                  amount:
                    subscription.amount,

                  currency:
                    subscription.currency,
                }
              : null,
        };
      }
    );

  return (
    <AppShell>
      <AdminStudentDetailContent
        student={{
          id:
            student.id,

          fullName:
            student.full_name,

          phone:
            student.phone,

          email:
            authUserResult.data
              .user.email ??
            null,

          createdAt:
            student.created_at,
        }}
        enrollments={
          enrollmentsData
        }
      />
    </AppShell>
  );
}
