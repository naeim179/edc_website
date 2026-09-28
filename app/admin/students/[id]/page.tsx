import AppShell from "@/components/AppShell";
import AdminStudentDetailContent from "@/components/AdminStudentDetailContent";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    return null;
  }

  const { data: enrollments, error: enrollmentError } = await supabase
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
    .order("enrolled_at", { ascending: false });

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  const courseIds =
    enrollments?.map((enrollment) => enrollment.course_id) ?? [];

  const { data: courses, error: coursesError } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, title, is_free")
          .in("id", courseIds)
      : { data: [], error: null };

  if (coursesError) {
    throw new Error(coursesError.message);
  }

  const { data: subscriptions, error: subscriptionsError } =
    courseIds.length > 0
      ? await supabase
          .from("subscriptions")
          .select("course_id, expires_at, status")
          .eq("student_id", id)
          .in("course_id", courseIds)
      : { data: [], error: null };

  if (subscriptionsError) {
    throw new Error(subscriptionsError.message);
  }

  const courseById = new Map(
    (courses ?? []).map((course) => [course.id, course])
  );

  const subscriptionByCourse = new Map(
    (subscriptions ?? []).map((sub) => [sub.course_id, sub])
  );

  const enrollmentsData = (enrollments ?? []).map((enrollment) => {
    const course = courseById.get(enrollment.course_id);
    const subscription = subscriptionByCourse.get(enrollment.course_id);

    const completedLessons =
      enrollment.lesson_progress?.filter((item) => item.is_completed)
        .length ?? 0;

    return {
      id: enrollment.id,
      courseId: enrollment.course_id,
      courseTitle: course?.title ?? null,
      isFree: Boolean(course?.is_free),
      completedLessons,
      subscription: subscription
        ? {
            expiresAt: subscription.expires_at,
            status: subscription.status,
          }
        : null,
    };
  });

  return (
    <AppShell>
      <AdminStudentDetailContent
        student={{
          id: student.id,
          fullName: student.full_name,
          createdAt: student.created_at,
        }}
        enrollments={enrollmentsData}
      />
    </AppShell>
  );
}
