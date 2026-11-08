import { getCourseStudentRoster } from "@/lib/course-student-roster";
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
        .select("id, title,course_type")
        .order("title"),

      db
        .from("assignments")
        .select(`
          id,
          course_id,
          target_student_id,
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

  const roster = await getCourseStudentRoster(db, (coursesResult.data??[]).map(c=>c.id));
  const courseOptions = (coursesResult.data??[]).map(c=>({...c,students:roster.filter(r=>r.courseId===c.id).map(r=>({id:r.studentId,name:r.name}))}));
  return (
    <AppShell>
      <AssignmentsManager
        mode="admin"
        courses={
          courseOptions
        }
        assignments={
          (assignmentsResult.data ??
            []) as never[]
        }
      />
    </AppShell>
  );
}
