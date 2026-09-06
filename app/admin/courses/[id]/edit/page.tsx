import AppShell from "@/components/AppShell";
import CourseForm from "@/components/admin/CourseForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      category,
      is_published
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!course) {
    return null;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold text-right">
          تعديل الدورة
        </h1>

        <CourseForm course={course} />
      </div>
    </AppShell>
  );
}
