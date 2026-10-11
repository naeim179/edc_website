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


type StoredFile = {
  path: string;
  name: string;
  size: number;
  type: string;
};

type StoredAudio = StoredFile & {
  duration?: number;
};

type SubmissionContent = {
  text: string;
  links: string[];
  files: StoredFile[];
  audio: StoredAudio[];
};


function cleanFile(
  value: unknown
): StoredFile | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof item.path !== "string" ||
    typeof item.name !== "string" ||
    typeof item.size !== "number" ||
    typeof item.type !== "string"
  ) {
    return null;
  }

  return {
    path:
      item.path,
    name:
      item.name.slice(
        0,
        180
      ),
    size:
      item.size,
    type:
      item.type.slice(
        0,
        120
      ),
  };
}


function normalizeContent(
  value: SubmissionContent,
  expectedPrefix: string
): SubmissionContent {
  const text =
    String(
      value?.text ??
        ""
    ).trim();

  if (
    text.length >
    20000
  ) {
    throw new Error(
      "Answer is too long"
    );
  }

  const links =
    Array.isArray(
      value?.links
    )
      ? value.links
          .map(
            (item) =>
              String(
                item
              ).trim()
          )
          .filter(Boolean)
          .slice(0, 5)
      : [];

  for (
    const link of links
  ) {
    let parsed: URL;

    try {
      parsed =
        new URL(link);
    } catch {
      throw new Error(
        "Invalid link"
      );
    }

    if (
      parsed.protocol !==
        "http:" &&
      parsed.protocol !==
        "https:"
    ) {
      throw new Error(
        "Invalid link"
      );
    }
  }

  const files =
    (
      Array.isArray(
        value?.files
      )
        ? value.files
        : []
    )
      .map(cleanFile)
      .filter(
        (
          item
        ): item is StoredFile =>
          Boolean(item)
      )
      .slice(0, 5);

  const audio:
    StoredAudio[] = [];

  const rawAudio =
    Array.isArray(
      value?.audio
    )
      ? value.audio
      : [];

  for (
    const item of
      rawAudio.slice(0, 1)
  ) {
    const file =
      cleanFile(
        item
      );

    if (!file) {
      continue;
    }

    const duration =
      typeof item.duration ===
      "number"
        ? Math.max(
            0,
            Math.round(
              item.duration
            )
          )
        : undefined;

    audio.push(
      duration === undefined
        ? file
        : {
            ...file,
            duration,
          }
    );
  }

  for (
    const item of [
      ...files,
      ...audio,
    ]
  ) {
    if (
      !item.path.startsWith(
        expectedPrefix
      )
    ) {
      throw new Error(
        "Invalid storage path"
      );
    }

    if (
      item.size < 0 ||
      item.size >
        26214400
    ) {
      throw new Error(
        "Invalid file size"
      );
    }
  }

  return {
    text,
    links,
    files,
    audio,
  };
}


async function getStudentAssignment(
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
    data: profile,
  } =
    await admin
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
    throw new Error(
      "Forbidden"
    );
  }

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
        due_at,
        allow_late,
        max_attempts,
        is_published
      `)
      .eq(
        "id",
        assignmentId
      )
      .maybeSingle();

  if (
    assignmentError ||
    !assignment ||
    !assignment.is_published
  ) {
    throw new Error(
      "Assignment not found"
    );
  }

  const {
    data: enrollment,
  } =
    await admin
      .from("enrollments")
      .select("id")
      .eq(
        "course_id",
        assignment.course_id
      )
      .eq(
        "student_id",
        user.id
      )
      .maybeSingle();

  if (!enrollment) {
    throw new Error(
      "Forbidden"
    );
  }

  return {
    user,
    assignment,
    admin,
  };
}


function refresh(
  assignmentId: string
) {
  revalidatePath(
    "/assignments"
  );

  revalidatePath(
    `/assignments/${assignmentId}`
  );

  revalidatePath(
    "/teacher/assignments"
  );

  revalidatePath(
    "/admin/assignments"
  );
}


export async function saveAssignmentDraft(
  assignmentId: string,
  rawContent: SubmissionContent
) {
  const {
    user,
    assignment,
    admin,
  } =
    await getStudentAssignment(
      assignmentId
    );

  const expectedPrefix =
    `submissions/${assignment.course_id}/${assignment.id}/${user.id}/`;

  const content =
    normalizeContent(
      rawContent,
      expectedPrefix
    );

  const {
    data: existing,
    error:
      existingError,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .select(`
        id,
        status,
        attempt_number
      `)
      .eq(
        "assignment_id",
        assignment.id
      )
      .eq(
        "student_id",
        user.id
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  if (
    existing &&
    [
      "submitted",
      "late",
      "graded",
    ].includes(
      existing.status
    )
  ) {
    throw new Error(
      "Submission is locked"
    );
  }

  const status =
    existing?.status ===
    "returned"
      ? "returned"
      : "draft";

  const payload = {
    assignment_id:
      assignment.id,
    student_id:
      user.id,
    content_json:
      content,
    status,
    attempt_number:
      existing
        ?.attempt_number ??
      0,
    updated_at:
      new Date()
        .toISOString(),
  };

  const {
    error,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .upsert(
        payload,
        {
          onConflict:
            "assignment_id,student_id",
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  refresh(
    assignmentId
  );

  return {
    success: true,
    status,
  };
}


export async function submitAssignment(
  assignmentId: string,
  rawContent: SubmissionContent
) {
  const {
    user,
    assignment,
    admin,
  } =
    await getStudentAssignment(
      assignmentId
    );

  const expectedPrefix =
    `submissions/${assignment.course_id}/${assignment.id}/${user.id}/`;

  const content =
    normalizeContent(
      rawContent,
      expectedPrefix
    );

  const hasAnswer =
    Boolean(
      content.text ||
      content.links.length ||
      content.files.length ||
      content.audio.length
    );

  if (!hasAnswer) {
    throw new Error(
      "Empty submission"
    );
  }

  const {
    data: existing,
    error:
      existingError,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .select(`
        id,
        status,
        attempt_number
      `)
      .eq(
        "assignment_id",
        assignment.id
      )
      .eq(
        "student_id",
        user.id
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  if (
    existing?.status ===
    "graded"
  ) {
    throw new Error(
      "Submission is locked"
    );
  }

  const attempts =
    existing
      ?.attempt_number ??
    0;

  if (
    assignment.max_attempts >
      0 &&
    attempts >=
      assignment.max_attempts
  ) {
    throw new Error(
      "No attempts remaining"
    );
  }

  const now =
    new Date();

  const isLate =
    Boolean(
      assignment.due_at &&
      now.getTime() >
        new Date(
          assignment.due_at
        ).getTime()
    );

  if (
    isLate &&
    !assignment.allow_late
  ) {
    throw new Error(
      "Deadline closed"
    );
  }

  const status =
    isLate
      ? "late"
      : "submitted";

  const {
    error,
  } =
    await admin
      .from(
        "assignment_submissions"
      )
      .upsert(
        {
          assignment_id:
            assignment.id,

          student_id:
            user.id,

          content_json:
            content,

          status,

          attempt_number:
            attempts + 1,

          submitted_at:
            now.toISOString(),

          score:
            null,

          graded_at:
            null,

          graded_by:
            null,

          updated_at:
            now.toISOString(),
        },
        {
          onConflict:
            "assignment_id,student_id",
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  refresh(
    assignmentId
  );

  return {
    success: true,
    status,
    attemptNumber:
      attempts + 1,
  };
}
