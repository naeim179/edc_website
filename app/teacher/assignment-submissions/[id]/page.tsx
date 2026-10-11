import {
  notFound,
} from "next/navigation";

import AppShell from "@/components/AppShell";

import TeacherAssignmentSubmissionList from "@/components/assignments/TeacherAssignmentSubmissionList";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  requireTeacher,
} from "@/lib/auth/require-teacher";


type StoredFile = {
  path: string;
  name: string;
  size: number;
  type: string;
};

type StoredAudio =
  StoredFile & {
    duration?:
      number;
  };


function objectValue(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}


function parseFiles(
  value: unknown
): StoredFile[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const row =
          item as Record<
            string,
            unknown
          >;

        const path =
          typeof row.path ===
          "string"
            ? row.path
            : "";

        if (!path) {
          return null;
        }

        return {
          path,

          name:
            typeof row.name ===
            "string"
              ? row.name
              : "file",

          size:
            typeof row.size ===
            "number"
              ? row.size
              : 0,

          type:
            typeof row.type ===
            "string"
              ? row.type
              : "",
        };
      }
    )
    .filter(
      (
        item
      ): item is StoredFile =>
        item !== null
    );
}


function parseAudio(
  value: unknown
): StoredAudio[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const result:
    StoredAudio[] = [];

  for (
    const item of
    value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const row =
      item as Record<
        string,
        unknown
      >;

    const path =
      typeof row.path ===
      "string"
        ? row.path
        : "";

    if (!path) {
      continue;
    }

    result.push({
      path,

      name:
        typeof row.name ===
        "string"
          ? row.name
          : "audio",

      size:
        typeof row.size ===
        "number"
          ? row.size
          : 0,

      type:
        typeof row.type ===
        "string"
          ? row.type
          : "",

      duration:
        typeof row.duration ===
        "number"
          ? row.duration
          : undefined,
    });
  }

  return result;
}


export default async function TeacherAssignmentSubmissionsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requireTeacher();

  const {
    id,
  } =
    await params;

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
        title,
        max_score
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (
    assignmentError ||
    !assignment
  ) {
    notFound();
  }

  const {
    data: instructor,
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

  if (!instructor) {
    notFound();
  }

  const [
    courseResult,
    submissionsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "courses"
        )
        .select(`
          id,
          title
        `)
        .eq(
          "id",
          assignment.course_id
        )
        .maybeSingle(),

      admin
        .from(
          "assignment_submissions"
        )
        .select(`
          id,
          student_id,
          status,
          attempt_number,
          submitted_at,
          content_json,
          score,
          feedback,
          updated_at
        `)
        .eq(
          "assignment_id",
          assignment.id
        )
        .neq(
          "status",
          "draft"
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    courseResult.error ||
    !courseResult.data
  ) {
    notFound();
  }

  if (
    submissionsResult.error
  ) {
    throw new Error(
      submissionsResult.error.message
    );
  }

  const submissions =
    submissionsResult.data ??
    [];

  const studentIds =
    Array.from(
      new Set(
        submissions.map(
          (
            submission
          ) =>
            submission.student_id
        )
      )
    );

  const {
    data: profiles,
    error:
      profilesError,
  } =
    studentIds.length >
    0
      ? await admin
          .from(
            "profiles"
          )
          .select(`
            id,
            full_name,
            username
          `)
          .in(
            "id",
            studentIds
          )
      : {
          data:
            [],
          error:
            null,
        };

  if (
    profilesError
  ) {
    throw new Error(
      profilesError.message
    );
  }

  const profileMap =
    new Map(
      (
        profiles ??
        []
      ).map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );


  async function signedUrl(
    path: string
  ) {
    const {
      data,
    } =
      await admin.storage
        .from(
          "assignment-files"
        )
        .createSignedUrl(
          path,
          3600
        );

    return (
      data?.signedUrl ??
      null
    );
  }


  const mapped =
    await Promise.all(
      submissions.map(
        async (
          submission
        ) => {
          const content =
            objectValue(
              submission.content_json
            );

          const files =
            parseFiles(
              content.files
            );

          const audio =
            parseAudio(
              content.audio
            );

          const [
            signedFiles,
            signedAudio,
          ] =
            await Promise.all([
              Promise.all(
                files.map(
                  async (
                    file
                  ) => ({
                    ...file,
                    url:
                      await signedUrl(
                        file.path
                      ),
                  })
                )
              ),

              Promise.all(
                audio.map(
                  async (
                    item
                  ) => ({
                    ...item,
                    url:
                      await signedUrl(
                        item.path
                      ),
                  })
                )
              ),
            ]);

          const profile =
            profileMap.get(
              submission.student_id
            );

          return {
            id:
              submission.id,

            studentName:
              profile
                ?.full_name ||
              profile
                ?.username ||
              "Student",

            status:
              submission.status,

            attemptNumber:
              submission.attempt_number,

            submittedAt:
              submission.submitted_at,

            text:
              typeof content.text ===
              "string"
                ? content.text
                : "",

            links:
              Array.isArray(
                content.links
              )
                ? content.links
                    .map(
                      (
                        link
                      ) =>
                        String(
                          link
                        )
                    )
                    .filter(
                      Boolean
                    )
                : [],

            files:
              signedFiles,

            audio:
              signedAudio,

            score:
              submission.score ==
              null
                ? null
                : Number(
                    submission.score
                  ),

            feedback:
              submission.feedback,
          };
        }
      )
    );

  return (
    <AppShell>
      <TeacherAssignmentSubmissionList
        assignment={{
          id:
            assignment.id,

          title:
            assignment.title,

          courseTitle:
            courseResult.data.title,

          maxScore:
            Number(
              assignment.max_score
            ),
        }}
        submissions={
          mapped
        }
      />
    </AppShell>
  );
}
