import Link from "next/link";
import AppShell from "@/components/AppShell";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCoursesPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      category,
      price,
      currency,
      is_free,
      is_published,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">

            <Link
              href="/admin/courses/new"
              className="bg-[#087a54] hover:bg-[#066b49] text-white px-5 py-3 rounded-xl font-bold transition"
            >
              + إضافة دورة
            </Link>

            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-800">
                إدارة الدورات
              </h1>

              <p className="text-sm text-slate-500 mt-2">
                إضافة وتعديل وإدارة الدورات التعليمية.
              </p>
            </div>

          </div>
        </div>

        {courses && courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                  <div className="flex items-center gap-3">
                    <DeleteCourseButton id={course.id} />

                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition"
                    >
                      تعديل
                    </Link>

                    <Link
                      href={`/admin/courses/${course.id}/sections`}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#087a54] rounded-lg font-bold text-sm transition"
                    >
                      إدارة المحتوى
                    </Link>
                  </div>

                  <div className="text-right">
                    <h2 className="text-lg font-bold text-slate-800">
                      {course.title}
                    </h2>

                    <p className="text-sm text-slate-500 mt-2">
                      التصنيف: {course.category ?? "غير محدد"}
                    </p>

                    <div className="flex flex-wrap justify-end gap-2 mt-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          course.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {course.is_published ? "منشورة" : "مسودة"}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        {course.is_free
                          ? "مجانية"
                          : `${course.price ?? 0} ${course.currency ?? "JOD"}`}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
            <p className="text-slate-500">
              لا توجد دورات حاليًا.
            </p>

            <Link
              href="/admin/courses/new"
              className="inline-block mt-5 bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold"
            >
              إنشاء أول دورة
            </Link>
          </div>
        )}

      </div>
    </AppShell>
  );
}
