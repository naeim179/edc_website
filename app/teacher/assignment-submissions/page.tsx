import AppShell from "@/components/AppShell";

import TeacherAssignmentReviewsContent from "@/components/assignments/TeacherAssignmentReviewsContent";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  requireTeacher,
} from "@/lib/auth/require-teacher";


export default async function TeacherAssignmentReviewsPage() {
  const user =
    await requireTeacher();

  const admin =
    createAdminClient();

  const {
    data: courseRows,
    error:
      courseRowsError,
  } =
    await admin
      .from(
        "course_instructors"
      )
      .select(
        "course_id"
      )
      .eq(
        "teacher_id",
        user.id
      );

  if (
    courseRowsError
  ) {
    throw new Error(
      courseRowsError.message
    );
  }

  const courseIds =
    Array.from(
      new Set(
        (
          courseRows ??
          []
        ).map(
          (
            row
          ) =>
            row.course_id
        )
      )
    );

  if (
    courseIds.length ===
    0
  ) {
    return (
      <AppShell>
        <TeacherAssignmentReviewsContent
          assignments={[]}
        />
      </AppShell>
    );
  }

  const [
    assignmentResult,
    courseResult,
  ] =
    await Promise.all([
      admin
        .from(
          "assignments"
        )
        .select(`
          id,
          course_id,
          title,
          max_score,
          created_at
        `)
        .in(
          "course_id",
          courseIds
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      admin
        .from(
          "courses"
        )
        .select(`
          id,
          title
        `)
        .in(
          "id",
          courseIds
        ),
    ]);

  if (
    assignmentResult.error
  ) {
    throw new Error(
      assignmentResult.error.message
    );
  }

  if (
    courseResult.error
  ) {
    throw new Error(
      courseResult.error.message
    );
  }

  const assignments =
    assignmentResult.data ??
    [];

  const assignmentIds =
    assignments.map(
      (
        assignment
      ) =>
        assignment.id
    );

  const {
    data: submissions,
    error:
      submissionsError,
  } =
    assignmentIds.length >
    0
      ? await admin
          .from(
            "assignment_submissions"
          )
          .select(`
            id,
            assignment_id,
            status
          `)
          .in(
            "assignment_id",
            assignmentIds
          )
          .neq(
            "status",
            "draft"
          )
      : {
          data:
            [],
          error:
            null,
        };

  if (
    submissionsError
  ) {
    throw new Error(
      submissionsError.message
    );
  }

  const courseTitles =
    new Map(
      (
        courseResult.data ??
        []
      ).map(
        (
          course
        ) => [
          course.id,
          course.title,
        ]
      )
    );

  const items =
    assignments.map(
      (
        assignment
      ) => {
        const related =
          (
            submissions ??
            []
          ).filter(
            (
              submission
            ) =>
              submission.assignment_id ===
              assignment.id
          );

        return {
          id:
            assignment.id,

          title:
            assignment.title,

          courseTitle:
            courseTitles.get(
              assignment.course_id
            ) ??
            "",

          maxScore:
            Number(
              assignment.max_score
            ),

          totalSubmissions:
            related.length,

          waitingReview:
            related.filter(
              (
                submission
              ) =>
                submission.status ===
                  "submitted" ||
                submission.status ===
                  "late"
            ).length,

          graded:
            related.filter(
              (
                submission
              ) =>
                submission.status ===
                "graded"
            ).length,
        };
      }
    );

  return (
    <AppShell>
      <TeacherAssignmentReviewsContent
        assignments={
          items
        }
      />
    </AppShell>
  );
}
