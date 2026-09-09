import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import {
  removeStudentEnrollment,
  resetStudentProgress,
} from "@/app/actions/admin-students";

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
          .select("id, title")
          .in("id", courseIds)
      : { data: [], error: null };

  if (coursesError) {
    throw new Error(coursesError.message);
  }

  const courseTitles = new Map(
    (courses ?? []).map((course) => [
      course.id,
      course.title,
    ])
  );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border p-6 text-right">
          <Link
            href="/admin/students"
            className="text-sm text-emerald-600"
          >
            ← العودة للطلاب
          </Link>

          <h1 className="text-2xl font-bold text-slate-800 mt-4">
            {student.full_name ?? "بدون اسم"}
          </h1>

          <p className="text-slate-500 mt-2">
            تاريخ التسجيل:{" "}
            {new Date(student.created_at).toLocaleDateString("ar")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-xl font-bold text-right mb-5">
            الدورات المسجل بها
          </h2>

          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const completed =
                  enrollment.lesson_progress?.filter(
                    (item) => item.is_completed
                  ).length ?? 0;

                const courseTitle =
                  courseTitles.get(enrollment.course_id) ??
                  "دورة غير متاحة";

                return (
                  <div
                    key={enrollment.id}
                    className="border rounded-xl p-5 text-right space-y-3"
                  >
                    <h3 className="font-bold text-lg">
                      {courseTitle}
                    </h3>

                    <p className="text-sm text-slate-500">
                      الدروس المكتملة: {completed}
                    </p>

                    <div className="flex gap-3 justify-end">
                      <form
                        action={resetStudentProgress.bind(
                          null,
                          id,
                          enrollment.id
                        )}
                      >
                        <button className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold">
                          إعادة التقدم
                        </button>
                      </form>

                      <form
                        action={removeStudentEnrollment.bind(
                          null,
                          id,
                          enrollment.id
                        )}
                      >
                        <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold">
                          إزالة التسجيل
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-slate-500">
              الطالب غير مسجل بأي دورة
            </p>
          )}
        </div>

      </div>
    </AppShell>
  );
}
