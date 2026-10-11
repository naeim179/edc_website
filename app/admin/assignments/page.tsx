import AppShell from "@/components/AppShell";

import AssignmentsManager from "@/components/assignments/AssignmentsManager";

import {
  requirePermission,
} from "@/lib/auth/admin-access";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


export default async function AdminAssignmentsPage() {
  await requirePermission(
    "manage_assignments"
  );

  const db =
    createAdminClient();

  const [
    coursesResult,
    assignmentsResult,
  ] =
    await Promise.all([
      db
        .from("courses")
        .select("id, title")
        .order("title"),

      db
        .from("assignments")
        .select(`
          id,
          course_id,
          title,
          instructions,
          due_at,
          max_score,
          allow_late,
          max_attempts,
          is_published,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    coursesResult.error
  ) {
    throw new Error(
      coursesResult.error.message
    );
  }

  if (
    assignmentsResult.error
  ) {
    throw new Error(
      assignmentsResult.error.message
    );
  }

  return (
    <AppShell>
      <AssignmentsManager
        mode="admin"
        courses={
          coursesResult.data ??
          []
        }
        assignments={
          (assignmentsResult.data ??
            []) as never[]
        }
      />
    </AppShell>
  );
}
