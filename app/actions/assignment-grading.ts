"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


async function requireTeacherAssignment(
  assignmentId: string
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: assignment,
    error:
      assignmentError,
  } =
    await admin
      .from(
        "assignments"
      )
      .select(`
        id,
        course_id,
        max_score
      `)
      .eq(
        "id",
        assignmentId
      )
      .maybeSingle();

  if (
    assignmentError ||
    !assignment
  ) {
    throw new Error(
      "Assignment not found"
    );
  }

  const {
    data: instructor,
    error:
      instructorError,
  } =
    await admin
      .from(
        "course_instructors"
      )
      .select("id")
      .eq(
        "course_id",
        assignment.course_id
      )
      .eq(
        "teacher_id",
        user.id
      )
      .maybeSingle();

  if (
    instructorError ||
    !instructor
  ) {
    throw new Error(
      "Forbidden"
    );
  }

  return {
    user,
    admin,
    assignment,
  };
}


function refreshAssignment(
  assignmentId: string
) {
  revalidatePath(
    "/teacher/assignment-submissions"
  );

  revalidatePath(
    `/teacher/assignment-submissions/${assignmentId}`
  );

  revalidatePath(
    "/teacher/assignments"
  );

  revalidatePath(
    "/assignments"
  );

  revalidatePath(
    `/assignments/${assignmentId}`
  );
}


export async function gradeAssignmentSubmission(
  assignmentId: string,
  submissionId: string,
  scoreValue: number,
  feedbackValue: string
) {
  const {
    user,
    admin,
    assignment,
  } =
    await requireTeacherAssignment(
      assignmentId
    );

  const score =
    Number(
      scoreValue
    );

  const maxScore =
    Number(
      assignment.max_score
    );

  if (
    !Number.isFinite(
      score
    ) ||
    score < 0 ||
    score > maxScore
  ) {
    throw new Error(
      `Score must be between 0 and ${maxScore}`
    );
  }

  const {
    data: submission,
    error:
      submissionError,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .select(`
        id,
        status,
        revision
      `)
      .eq(
        "id",
        submissionId
      )
      .eq(
        "assignment_id",
        assignmentId
      )
      .maybeSingle();

  if (
    submissionError ||
    !submission
  ) {
    throw new Error(
      "Submission not found"
    );
  }

  if (
    ![
      "submitted",
      "late",
      "graded",
    ].includes(
      submission.status
    )
  ) {
    throw new Error(
      "This submission cannot be graded yet"
    );
  }

  const feedback =
    String(
      feedbackValue ??
        ""
    )
      .trim()
      .slice(
        0,
        5000
      );

  const { error } = await admin.rpc("review_assignment_submission", {
    p_assignment_id: assignmentId, p_submission_id: submissionId, p_teacher_id: user.id,
    p_revision: submission.revision, p_return: false, p_score: score, p_feedback: feedback,
  });

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAssignment(
    assignmentId
  );

  return {
    success: true,
  };
}


export async function returnAssignmentSubmission(
  assignmentId: string,
  submissionId: string,
  feedbackValue: string
) {
  const {
    user,
    admin,
  } =
    await requireTeacherAssignment(
      assignmentId
    );

  const {
    data: submission,
    error:
      submissionError,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .select(`
        id,
        status,
        attempt_number,
        revision
      `)
      .eq(
        "id",
        submissionId
      )
      .eq(
        "assignment_id",
        assignmentId
      )
      .maybeSingle();

  if (
    submissionError ||
    !submission
  ) {
    throw new Error(
      "Submission not found"
    );
  }

  if (
    ![
      "submitted",
      "late",
      "graded",
    ].includes(
      submission.status
    )
  ) {
    throw new Error(
      "This submission cannot be returned"
    );
  }

  const feedback =
    String(
      feedbackValue ??
        ""
    )
      .trim()
      .slice(
        0,
        5000
      );

  if (!feedback) {
    throw new Error(
      "Feedback is required when returning a submission"
    );
  }

  const { error } = await admin.rpc("review_assignment_submission", {
    p_assignment_id: assignmentId, p_submission_id: submissionId, p_teacher_id: user.id,
    p_revision: submission.revision, p_return: true, p_score: null, p_feedback: feedback,
  });

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAssignment(
    assignmentId
  );

  return {
    success: true,
  };
}
