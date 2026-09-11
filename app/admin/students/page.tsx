import Link from "next/link";
import AppShell from "@/components/AppShell";
import AdminStudentsContent from "@/components/AdminStudentsContent";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      created_at,
      enrollments (
        id
      )
    `)
    .eq("role", "student")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <AdminStudentsContent
        students={students ?? []}
      />
    </AppShell>
  );
}
