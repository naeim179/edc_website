import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentAssignmentHistory = {
  assignment_id: string;
  course_id: string;
  course_title: string;
  assignment_title: string;
  status: string;
  max_score: number;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  course_access: boolean;
};

export async function readStudentAssignmentHistory(
  supabase: SupabaseClient,
  assignmentId: string | null = null,
): Promise<StudentAssignmentHistory[]> {
  const { data, error } = await supabase.rpc("read_student_assignment_history", {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error("Unable to read assignment history");
  return data ?? [];
}
