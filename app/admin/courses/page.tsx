import AppShell from "@/components/AppShell";
import AdminCoursesContent from "@/components/AdminCoursesContent";
import { requirePermission } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";
import { loadCoursePage } from "@/lib/course-pages";
import { listFilters, type SearchValues } from "@/lib/list-pages";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  await requirePermission("manage_courses");
  const filters = listFilters(await searchParams);
  const data = await loadCoursePage(await createClient(), filters, true);
  return (
    <AppShell>
      <AdminCoursesContent data={data} filters={filters} />
    </AppShell>
  );
}
