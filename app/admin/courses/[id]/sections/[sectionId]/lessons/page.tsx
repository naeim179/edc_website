import AppShell from "@/components/AppShell";
import LessonForm from "@/components/admin/LessonForm";
import DeleteLessonButton from "@/components/admin/DeleteLessonButton";
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
      content_url
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
          {lessons?.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-white border rounded-xl p-5 text-right flex justify-between"
            >
              <DeleteLessonButton
                id={lesson.id}
                courseId={id}
                sectionId={sectionId}
              />

              <div>
                <h2 className="font-bold">
                  {lesson.title}
                </h2>

                <p className="text-sm text-slate-500">
                  ترتيب: {lesson.order_index}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
