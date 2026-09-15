import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import {
  teacherCreateSection,
  teacherDeleteSection,
  teacherUpdateSection,
} from "@/app/actions/teacher-content";

export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const allowed = await canManageCourse(id);

  if (!allowed) {
    return null;
  }

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!course) {
    return null;
  }

  const { data: sections } = await admin
    .from("sections")
    .select("id, title, order_index")
    .eq("course_id", id)
    .order("order_index", {
      ascending: true,
    });

  const createAction =
    teacherCreateSection.bind(null, id);

  return (
    <AppShell>
      <div
        className="max-w-6xl mx-auto w-full space-y-6 p-6"
        dir="rtl"
      >
        <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8">
          <Link
            href="/teacher"
            className="text-blue-100 font-bold"
          >
            العودة للوحة المعلم
          </Link>

          <h1 className="text-3xl font-bold mt-5">
            إدارة محتوى الدورة
          </h1>

          <p className="mt-2 text-blue-100">
            {course.title}
          </p>
        </section>

        <form
          action={createAction}
          className="bg-white border rounded-2xl p-6"
        >
          <h2 className="font-bold text-lg mb-4">
            إضافة قسم جديد
          </h2>

          <input
            name="title"
            required
            placeholder="اسم القسم"
            className="w-full border rounded-xl px-4 py-3 mb-4"
          />

          <button
            type="submit"
            className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
          >
            إضافة القسم
          </button>
        </form>

        <div className="grid md:grid-cols-2 gap-5">
          {sections?.map((section) => {
            const updateAction =
              teacherUpdateSection.bind(
                null,
                section.id,
                id
              );

            const deleteAction =
              teacherDeleteSection.bind(
                null,
                section.id,
                id
              );

            return (
              <div
                key={section.id}
                className="bg-white border rounded-2xl p-5 space-y-4"
              >
                <form
                  action={updateAction}
                  className="space-y-4"
                >
                  <input
                    name="title"
                    defaultValue={section.title}
                    required
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <input
                    name="order_index"
                    type="number"
                    min="1"
                    defaultValue={section.order_index}
                    required
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <button
                    type="submit"
                    className="w-full bg-[#124b8a] text-white py-3 rounded-xl font-bold"
                  >
                    حفظ التعديل
                  </button>
                </form>

                <Link
                  href={`/teacher/courses/${id}/sections/${section.id}/lessons`}
                  className="block text-center bg-emerald-50 text-[#087a54] py-3 rounded-xl font-bold"
                >
                  إدارة الدروس
                </Link>

                <form action={deleteAction}>
                  <button
                    type="submit"
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold"
                  >
                    حذف القسم
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
