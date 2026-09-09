import Link from "next/link";
import AppShell from "@/components/AppShell";
import SectionForm from "@/components/admin/SectionForm";
import {
  deleteSection,
  updateSection,
} from "@/app/actions/admin-sections";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function SectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course) {
    return null;
  }

  const { data: sections, error } = await supabase
    .from("sections")
    .select(`
      id,
      title,
      order_index
    `)
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border p-6 text-right">
          <Link
            href={`/admin/courses/${id}/edit`}
            className="text-sm text-[#087a54] font-bold"
          >
            ← العودة للدورة
          </Link>

          <h1 className="text-2xl font-bold mt-4">
            إدارة محتوى: {course.title}
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            أضف الأقسام وعدّل ترتيبها ومحتواها.
          </p>
        </div>

        <SectionForm courseId={id} />

        <div className="space-y-4">
          {sections && sections.length > 0 ? (
            sections.map((section) => {
              const updateAction = updateSection.bind(
                null,
                section.id,
                id
              );

              const deleteAction = deleteSection.bind(
                null,
                section.id,
                id
              );

              return (
                <div
                  key={section.id}
                  className="bg-white rounded-2xl border p-5"
                >
                  <form
                    action={updateAction}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor={`title-${section.id}`}
                        className="block mb-2 font-bold text-slate-700 text-right"
                      >
                        اسم القسم
                      </label>

                      <input
                        id={`title-${section.id}`}
                        name="title"
                        type="text"
                        required
                        defaultValue={section.title}
                        className="w-full border rounded-xl px-4 py-3 text-right"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`order-${section.id}`}
                        className="block mb-2 font-bold text-slate-700 text-right"
                      >
                        ترتيب القسم
                      </label>

                      <input
                        id={`order-${section.id}`}
                        name="order_index"
                        type="number"
                        min="1"
                        step="1"
                        required
                        defaultValue={section.order_index}
                        className="w-full border rounded-xl px-4 py-3 text-right"
                      />

                      <p className="text-xs text-slate-500 mt-2 text-right">
                        يمكنك تغيير الرقم لتعديل ترتيب ظهور القسم.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-end">
                      <button
                        type="submit"
                        className="bg-[#087a54] hover:bg-[#066b49] text-white px-5 py-2.5 rounded-xl font-bold transition"
                      >
                        حفظ التعديل
                      </button>

                      <Link
                        href={`/admin/courses/${id}/sections/${section.id}/lessons`}
                        className="bg-emerald-50 text-[#087a54] px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition"
                      >
                        إدارة الدروس
                      </Link>
                    </div>
                  </form>

                  <div className="border-t mt-5 pt-4">
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold hover:bg-red-100 transition"
                      >
                        حذف القسم
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
              لا توجد أقسام بعد.
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
