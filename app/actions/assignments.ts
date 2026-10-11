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


async function requireAssignmentManager(
  courseId: string
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

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        is_super_admin,
        permissions
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profile?.role ===
    "admin"
  ) {
    const permissions =
      (
        profile.permissions ??
        []
      ) as string[];

    if (
      profile.is_super_admin ||
      permissions.includes(
        "manage_assignments"
      )
    ) {
      return user;
    }
  }

  if (
    profile?.role ===
    "teacher"
  ) {
    const {
      data:
        assignment,
    } =
      await supabase
        .from(
          "course_instructors"
        )
        .select("id")
        .eq(
          "course_id",
          courseId
        )
        .eq(
          "teacher_id",
          user.id
        )
        .maybeSingle();

    if (assignment) {
      return user;
    }
  }

  throw new Error(
    "Forbidden"
  );
}


function refreshAssignments() {
  revalidatePath(
    "/assignments"
  );

  revalidatePath(
    "/teacher/assignments"
  );

  revalidatePath(
    "/admin/assignments"
  );
}


export async function createAssignment(
  formData: FormData
) {
  const courseId =
    String(
      formData.get(
        "course_id"
      ) ?? ""
    ).trim();

  const user =
    await requireAssignmentManager(
      courseId
    );

  const title =
    String(
      formData.get(
        "title"
      ) ?? ""
    ).trim();

  const instructions =
    String(
      formData.get(
        "instructions"
      ) ?? ""
    ).trim();

  const dueRaw =
    String(
      formData.get(
        "due_at"
      ) ?? ""
    ).trim();

  const maxScore =
    Number(
      formData.get(
        "max_score"
      ) ?? 100
    );

  const maxAttempts =
    Number(
      formData.get(
        "max_attempts"
      ) ?? 1
    );

  const allowLate =
    formData.get(
      "allow_late"
    ) === "on";

  if (!courseId) {
    throw new Error(
      "Course is required"
    );
  }

  if (!title) {
    throw new Error(
      "Assignment title is required"
    );
  }

  if (
    title.length >
    160
  ) {
    throw new Error(
      "Assignment title is too long"
    );
  }

  if (
    instructions.length >
    10000
  ) {
    throw new Error(
      "Instructions are too long"
    );
  }

  if (
    !Number.isFinite(
      maxScore
    ) ||
    maxScore <= 0 ||
    maxScore >
      10000
  ) {
    throw new Error(
      "Invalid maximum score"
    );
  }

  if (
    !Number.isInteger(
      maxAttempts
    ) ||
    maxAttempts < 0 ||
    maxAttempts > 10
  ) {
    throw new Error(
      "Invalid attempts value"
    );
  }

  const dueAt =
    dueRaw
      ? new Date(
          dueRaw
        ).toISOString()
      : null;

  const db =
    createAdminClient();

  const {
    error,
  } = await db
    .from("assignments")
    .insert({
      course_id:
        courseId,
      title,
      instructions,
      due_at:
        dueAt,
      max_score:
        maxScore,
      allow_late:
        allowLate,
      max_attempts:
        maxAttempts,
      is_published:
        true,
      created_by:
        user.id,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAssignments();

  return {
    success: true,
  };
}


function collectStoragePaths(
  value: unknown,
  result:
    Set<string>
) {
  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      collectStoragePaths(
        item,
        result
      );
    }

    return;
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return;
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof object.path ===
    "string" &&
    object.path
  ) {
    result.add(
      object.path
    );
  }

  for (
    const item of Object.values(
      object
    )
  ) {
    collectStoragePaths(
      item,
      result
    );
  }
}


export async function deleteAssignment(
  assignmentId: string
) {
  const db =
    createAdminClient();

  const {
    data: assignment,
    error:
      assignmentError,
  } =
    await db
      .from("assignments")
      .select(`
        id,
        course_id,
        resources_json
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
      assignmentError?.message ??
        "Assignment not found"
    );
  }

  await requireAssignmentManager(
    assignment.course_id
  );

  const {
    data:
      submissions,
  } =
    await db
      .from(
        "assignment_submissions"
      )
      .select(
        "content_json"
      )
      .eq(
        "assignment_id",
        assignmentId
      );

  const paths =
    new Set<string>();

  collectStoragePaths(
    assignment.resources_json,
    paths
  );

  for (
    const submission of
      submissions ?? []
  ) {
    collectStoragePaths(
      submission.content_json,
      paths
    );
  }

  const allPaths =
    [...paths];

  for (
    let index = 0;
    index <
    allPaths.length;
    index += 100
  ) {
    const chunk =
      allPaths.slice(
        index,
        index + 100
      );

    if (
      chunk.length >
      0
    ) {
      const {
        error:
          storageError,
      } =
        await db.storage
          .from(
            "assignment-files"
          )
          .remove(
            chunk
          );

      if (
        storageError
      ) {
        throw new Error(
          storageError.message
        );
      }
    }
  }

  const {
    error:
      deleteError,
  } =
    await db
      .from("assignments")
      .delete()
      .eq(
        "id",
        assignmentId
      );

  if (
    deleteError
  ) {
    throw new Error(
      deleteError.message
    );
  }

  refreshAssignments();

  return {
    success: true,
  };
}
