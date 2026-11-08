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
      .or(`target_student_id.is.null,target_student_id.eq.${user.id}`)
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

  const { data, error } = await admin.rpc("write_assignment_submission", {
    p_assignment_id: assignment.id, p_student_id: user.id, p_content: content, p_submit: false,
  });
  if (error) throw new Error(error.message);
  refresh(assignmentId);
  return { success: true, status: data.status as string };
}

export async function submitAssignment(assignmentId: string, rawContent: SubmissionContent) {
  const { user, assignment, admin } = await getStudentAssignment(assignmentId);
  const content = normalizeContent(rawContent, `submissions/${assignment.course_id}/${assignment.id}/${user.id}/`);
  const { data, error } = await admin.rpc("write_assignment_submission", {
    p_assignment_id: assignment.id, p_student_id: user.id, p_content: content, p_submit: true,
  });
  if (error) throw new Error(error.message);
  refresh(assignmentId);
  return { success: true, status: data.status as string, attemptNumber: Number(data.attempt_number) };
}
