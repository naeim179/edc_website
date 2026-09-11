import AppShell from "@/components/AppShell";
import LessonForm from "@/components/admin/LessonForm";
import DeleteLessonButton from "@/components/admin/DeleteLessonButton";
import { updateLesson } from "@/app/actions/admin-lessons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function LessonsPage({
  params,
}: {
  params: Promise<{
    id: string;
    sectionId: string;
  }>;
}) {
  await requireAdmin();

  const { id, sectionId } = await params;

  const supabase = await createClient();


  const { data: section } = await supabase
    .from("sections")
    .select("title")
    .eq("id", sectionId)
    .maybeSingle();


  const { data: lessons } = await supabase
    .from("lessons")
    .select(`
      id,
      title,
      order_index,
      content_url,
      is_free_preview
    `)
    .eq("section_id", sectionId)
    .order("order_index");


  return (
    <AppShell>

      <div
        className="max-w-6xl mx-auto w-full space-y-6"
        dir="rtl"
      >


        <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8">

          <h1 className="text-3xl font-bold">
            إدارة الدروس
          </h1>

          <p className="mt-2 text-blue-100">
            القسم: {section?.title}
          </p>

        </section>



        <LessonForm
          sectionId={sectionId}
          courseId={id}
        />



        {lessons && lessons.length > 0 ? (

          <div className="grid md:grid-cols-2 gap-5">


            {lessons.map((lesson) => {

              const updateAction =
                updateLesson.bind(
                  null,
                  lesson.id,
                  id,
                  sectionId
                );


              return (

                <div
                  key={lesson.id}
                  className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 space-y-5"
                >


                  <div className="flex justify-between items-start">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        lesson.is_free_preview
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lesson.is_free_preview
                        ? "معاينة مجانية"
                        : "مغلق"}
                    </span>


                    <h2 className="text-lg font-bold text-slate-800">
                      {lesson.title}
                    </h2>

                  </div>



                  <form
                    action={updateAction}
                    className="space-y-4"
                  >


                    <div>

                      <label className="block text-sm font-bold mb-2 text-slate-600">
                        عنوان الدرس
                      </label>

                      <input
                        name="title"
                        defaultValue={lesson.title}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-right"
                        required
                      />

                    </div>



                    <div>

                      <label className="block text-sm font-bold mb-2 text-slate-600">
                        رابط المحتوى
                      </label>

                      <input
                        name="content_url"
                        defaultValue={lesson.content_url ?? ""}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                      />

                    </div>



                    <div>

                      <label className="block text-sm font-bold mb-2 text-slate-600">
                        ترتيب الدرس
                      </label>

                      <input
                        name="order_index"
                        type="number"
                        defaultValue={lesson.order_index}
                        className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                      />

                    </div>



                    <label className="flex justify-end gap-2 items-center text-sm font-bold text-slate-700">

                      معاينة مجانية

                      <input
                        type="checkbox"
                        name="is_free_preview"
                        defaultChecked={
                          lesson.is_free_preview
                        }
                      />

                    </label>



                    <button
                      type="submit"
                      className="w-full bg-[#124b8a] hover:bg-[#0d3b6e] text-white py-3 rounded-xl font-bold"
                    >
                      حفظ التعديل
                    </button>


                  </form>



                  <DeleteLessonButton
                    id={lesson.id}
                    courseId={id}
                    sectionId={sectionId}
                  />


                </div>

              );

            })}


          </div>

        ) : (

          <div className="bg-white rounded-2xl border p-10 text-center text-slate-500">
            لا توجد دروس حالياً.
          </div>

        )}


      </div>

    </AppShell>
  );
}
