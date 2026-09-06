import Link from "next/link";
import AppShell from "@/components/AppShell";
import SectionForm from "@/components/admin/SectionForm";
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
            className="text-sm text-[#087a54]"
          >
            ← العودة للدورة
          </Link>

          <h1 className="text-2xl font-bold mt-4">
            إدارة محتوى: {course.title}
          </h1>
        </div>

        <SectionForm courseId={id} />

        <div className="space-y-4">
          {sections?.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-xl border p-5 text-right"
            >
              <h2 className="font-bold">
                {section.title}
              </h2>

              <p className="text-sm text-slate-500">
                الترتيب: {section.order_index}
              </p>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
