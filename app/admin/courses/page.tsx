import AppShell from "@/components/AppShell";
import AdminCoursesContent from "@/components/AdminCoursesContent";
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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <AdminCoursesContent
        courses={courses ?? []}
      />
    </AppShell>
  );
}
