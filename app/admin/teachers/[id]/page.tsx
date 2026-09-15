import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assignCourseToTeacher,
  removeCourseFromTeacher,
  updateTeacherAccount,
} from "@/app/actions/teachers";

export default async function TeacherManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();

  const { data: teacher } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      created_at
    `)
    .eq("id", id)
    .eq("role", "teacher")
    .maybeSingle();

  if (!teacher) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto p-6 text-right" dir="rtl">
          <h1 className="text-2xl font-bold">
            المعلم غير موجود
          </h1>
        </div>
      </AppShell>
    );
  }

  const { data: authData } =
    await admin.auth.admin.getUserById(id);

  const email = authData.user?.email ?? "";

  const { data: assignments } = await admin
    .from("course_instructors")
    .select(`
      id,
      course_id
    `)
    .eq("teacher_id", id);

  const assignmentCourseIds =
    (assignments ?? []).map(
      (assignment) => assignment.course_id
    );

  const { data: assignedCourses } = await admin
    .from("courses")
    .select("id, title")
    .in("id", assignmentCourseIds);

  const courseNames = new Map(
    (assignedCourses ?? []).map((course) => [
      course.id,
      course.title,
    ])
  );

  const { data: allCourses } = await admin
    .from("courses")
    .select("id, title")
    .order("created_at", {
      ascending: false,
    });

  const assignedCourseIds = new Set(
    (assignments ?? []).map(
      (assignment) => assignment.course_id
    )
  );

  const availableCourses = (allCourses ?? []).filter(
    (course) => !assignedCourseIds.has(course.id)
  );

  const updateAction =
    updateTeacherAccount.bind(null, id);

  const assignAction =
    assignCourseToTeacher.bind(null, id);

  return (
    <AppShell>
      <div
        className="max-w-5xl mx-auto p-6 space-y-6"
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">
            إدارة حساب المعلم
          </h1>

          <Link
            href="/admin/teachers"
            className="text-[#124b8a] font-bold"
          >
            العودة للمعلمين
          </Link>
        </div>

        <form
          action={updateAction}
          className="bg-white border rounded-2xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-lg font-bold">
              معلومات الحساب
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              يمكنك تعديل الاسم والبريد الإلكتروني وكلمة المرور.
            </p>
          </div>

          <div>
            <label className="block font-bold mb-2">
              اسم المعلم
            </label>

            <input
              name="fullName"
              defaultValue={teacher.full_name ?? ""}
              required
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">
              البريد الإلكتروني
            </label>

            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-bold mb-2">
              كلمة مرور جديدة
            </label>

            <input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="اتركها فارغة إذا لا تريد تغييرها"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="text-sm text-slate-500">
            تاريخ إنشاء الحساب:{" "}
            {new Date(
              teacher.created_at
            ).toLocaleDateString("ar-JO")}
          </div>

          <button
            type="submit"
            className="bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
          >
            حفظ بيانات المعلم
          </button>
        </form>

        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-5">
            الدورات المعينة للمعلم
          </h2>

          <div className="space-y-3">
            {assignments?.map((assignment) => {
              const removeAction =
                removeCourseFromTeacher.bind(
                  null,
                  id,
                  assignment.id
                );

              return (
                <div
                  key={assignment.id}
                  className="border rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <span className="font-bold">
                    {courseNames.get(assignment.course_id) ??
                      "دورة بدون اسم"}
                  </span>

                  <form action={removeAction}>
                    <button
                      type="submit"
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold"
                    >
                      إزالة الدورة
                    </button>
                  </form>
                </div>
              );
            })}

            {(!assignments ||
              assignments.length === 0) && (
              <p className="text-slate-500">
                لا توجد دورات معينة لهذا المعلم.
              </p>
            )}
          </div>
        </div>

        <form
          action={assignAction}
          className="bg-white border rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold mb-5">
            إضافة دورة للمعلم
          </h2>

          {availableCourses.length > 0 ? (
            <>
              <select
                name="courseId"
                required
                defaultValue=""
                className="w-full border rounded-xl px-4 py-3 mb-4"
              >
                <option value="" disabled>
                  اختر الدورة
                </option>

                {availableCourses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.title}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
              >
                إضافة الدورة
              </button>
            </>
          ) : (
            <p className="text-slate-500">
              جميع الدورات الحالية معينة لهذا المعلم.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}
