import {
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";

import StudentAssignmentsContent from "@/components/assignments/StudentAssignmentsContent";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


function firstOf<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value ?? null;
}


export default async function AssignmentsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profile?.role !==
    "student"
  ) {
    redirect("/");
  }

  const db =
    createAdminClient();

  const {
    data:
      enrollmentRows,
  } =
    await db
      .from("enrollments")
      .select("course_id")
      .eq(
        "student_id",
        user.id
      );

  const courseIds =
    (
      enrollmentRows ??
      []
    ).map(
      (row) =>
        row.course_id
    );

  if (
    courseIds.length ===
    0
  ) {
    return (
      <AppShell>
        <StudentAssignmentsContent
          assignments={[]}
        />
      </AppShell>
    );
  }

  const {
    data:
      assignmentRows,
    error:
      assignmentsError,
  } =
    await db
      .from("assignments")
      .select(`
        id,
        course_id,
        title,
        instructions,
        due_at,
        max_score,
        course:courses (
          title
        )
      `)
      .in(
        "course_id",
        courseIds
      )
      .eq(
        "is_published",
        true
      )
      .order(
        "due_at",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      );

  if (
    assignmentsError
  ) {
    throw new Error(
      assignmentsError.message
    );
  }

  const assignmentIds =
    (
      assignmentRows ??
      []
    ).map(
      (row) =>
        row.id
    );

  const {
    data:
      submissionRows,
  } =
    assignmentIds.length >
    0
      ? await db
          .from(
            "assignment_submissions"
          )
          .select(`
            assignment_id,
            status,
            score
          `)
          .eq(
            "student_id",
            user.id
          )
          .in(
            "assignment_id",
            assignmentIds
          )
      : {
          data: [],
        };

  const submissionMap =
    new Map(
      (
        submissionRows ??
        []
      ).map(
        (row) => [
          row.assignment_id,
          row,
        ]
      )
    );

  const assignments =
    (
      assignmentRows ??
      []
    ).map(
      (row) => {
        const course =
          firstOf(
            row.course
          );

        const submission =
          submissionMap.get(
            row.id
          );

        return {
          id:
            row.id,
          title:
            row.title,
          instructions:
            row.instructions,
          due_at:
            row.due_at,
          max_score:
            Number(
              row.max_score
            ),
          courseTitle:
            course?.title ??
            "—",
          status:
            submission?.status ??
            null,
          score:
            submission?.score ==
            null
              ? null
              : Number(
                  submission.score
                ),
        };
      }
    );

  return (
    <AppShell>
      <StudentAssignmentsContent
        assignments={
          assignments
        }
      />
    </AppShell>
  );
}
