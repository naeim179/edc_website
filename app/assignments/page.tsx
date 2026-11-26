import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import StudentAssignmentsContent from "@/components/assignments/StudentAssignmentsContent";
import { createClient } from "@/lib/supabase/server";
import { readStudentAssignmentHistory } from "@/lib/student-assignment-history";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "student") redirect("/");

  const [active, history] = await Promise.all([
    supabase.from("assignments")
      .select(`
        id, title, instructions, due_at, max_score,
        course:courses(title), submissions:assignment_submissions(status, score)
      `)
      .eq("is_published", true)
      .eq("submissions.student_id", user.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    readStudentAssignmentHistory(supabase),
  ]);
  if (active.error) throw new Error("Unable to load assignments");

  const assignments = (active.data ?? []).map(row => {
    const course = Array.isArray(row.course) ? row.course[0] : row.course;
    const submission = row.submissions?.[0];
    return {
      id: row.id,
      title: row.title,
      instructions: row.instructions,
      due_at: row.due_at,
      max_score: Number(row.max_score),
      courseTitle: course?.title ?? "—",
      status: submission?.status ?? null,
      score: submission?.score == null ? null : Number(submission.score),
      historyOnly: false,
    };
  });

  const activeIds = new Set(assignments.map(assignment => assignment.id));
  const historyCards = history.filter(row => !activeIds.has(row.assignment_id)).map(row => ({
    id: row.assignment_id,
    title: row.assignment_title,
    instructions: null,
    due_at: null,
    max_score: Number(row.max_score),
    courseTitle: row.course_title,
    status: row.status,
    score: row.score == null ? null : Number(row.score),
    historyOnly: true,
  }));

  return (
    <AppShell>
      <StudentAssignmentsContent assignments={[...assignments, ...historyCards]} />
    </AppShell>
  );
}
