import AppShell from "@/components/AppShell";
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
      is_published,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-right">
          <h1 className="text-2xl font-bold text-slate-800">
            إدارة الدورات
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            عرض وإدارة الدورات التعليمية.
          </p>
        </div>

        <div className="space-y-4">
          {courses && courses.length > 0 ? (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-100 p-5 text-right"
              >
                <h2 className="font-bold text-slate-800">
                  {course.title}
                </h2>

                <p className="text-sm text-slate-500 mt-2">
                  التصنيف: {course.category ?? "غير محدد"}
                </p>

                <p className="text-sm mt-1">
                  الحالة:{" "}
                  {course.is_published
                    ? "منشورة"
                    : "مسودة"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-right">
              لا توجد دورات حاليًا.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
