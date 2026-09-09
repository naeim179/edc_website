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
      <div className="max-w-5xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-xl border p-6 text-right">
          <h1 className="text-2xl font-bold">
            دروس: {section?.title}
          </h1>
        </div>

        <LessonForm
          sectionId={sectionId}
          courseId={id}
        />

        <div className="space-y-4">
          {lessons?.map((lesson) => {
            const updateAction = updateLesson.bind(
              null,
              lesson.id,
              id,
              sectionId
            );

            return (
              <div
                key={lesson.id}
                className="bg-white border rounded-xl p-5 space-y-4"
              >

                <form
                  action={updateAction}
                  className="space-y-4 text-right"
                >

                  <input
                    name="title"
                    defaultValue={lesson.title}
                    className="w-full border rounded-lg p-3"
                    placeholder="عنوان الدرس"
                    required
                  />

                  <input
                    name="content_url"
                    defaultValue={lesson.content_url ?? ""}
                    className="w-full border rounded-lg p-3"
                    placeholder="رابط المحتوى"
                  />

                  <input
                    name="order_index"
                    type="number"
                    defaultValue={lesson.order_index}
                    className="w-full border rounded-lg p-3"
                  />

                  <label className="flex gap-2 justify-end items-center">
                    <span>
                      معاينة مجانية
                    </span>

                    <input
                      type="checkbox"
                      name="is_free_preview"
                      defaultChecked={
                        lesson.is_free_preview
                      }
                    />
                  </label>


                  <div className="flex justify-between items-center">

                    <DeleteLessonButton
                      id={lesson.id}
                      courseId={id}
                      sectionId={sectionId}
                    />

                    <button
                      type="submit"
                      className="bg-[#087a54] text-white px-5 py-2 rounded-lg font-bold"
                    >
                      حفظ التعديل
                    </button>

                  </div>

                </form>

              </div>
            );
          })}
        </div>

      </div>
    </AppShell>
  );
}
