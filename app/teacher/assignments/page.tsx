import { getCourseStudentRoster } from "@/lib/course-student-roster";
import {
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";

import AssignmentsManager from "@/components/assignments/AssignmentsManager";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


export default async function TeacherAssignmentsPage({searchParams}:{searchParams:Promise<{course?:string;student?:string}>}) {
  const query=await searchParams;
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
    "teacher"
  ) {
    redirect("/");
  }

  const db =
    createAdminClient();

  const {
    data:
      instructorRows,
    error:
      instructorError,
  } =
    await db
      .from(
        "course_instructors"
      )
      .select("course_id")
      .eq(
        "teacher_id",
        user.id
      );

  if (
    instructorError
  ) {
    throw new Error(
      instructorError.message
    );
  }

  const courseIds =
    (
      instructorRows ??
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
        <AssignmentsManager
          mode="teacher"
          courses={[]}
          assignments={[]}
        />
      </AppShell>
    );
  }

  const [
    coursesResult,
    assignmentsResult,
  ] =
    await Promise.all([
      db
        .from("courses")
        .select("id, title,course_type")
        .in(
          "id",
          courseIds
        )
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
        mode="teacher"
        initialCourseId={query.course}
        initialStudentId={query.student}
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
