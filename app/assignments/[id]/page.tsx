import {
  notFound,
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";

import AssignmentSubmissionForm from "@/components/assignments/AssignmentSubmissionForm";

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
  url?: string | null;
};

type StoredAudio =
  StoredFile & {
    duration?: number;
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


function storedFiles(
  value: unknown
): StoredFile[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item ===
          "object"
    )
    .map(
      (item) => {
        const row =
          item as Record<
            string,
            unknown
          >;

        return {
          path:
            String(
              row.path ??
                ""
            ),

          name:
            String(
              row.name ??
                "file"
            ),

          size:
            Number(
              row.size ??
                0
            ),

          type:
            String(
              row.type ??
                ""
            ),
        };
      }
    )
    .filter(
      (item) =>
        Boolean(
          item.path
        )
    );
}


function storedAudio(
  value: unknown
): StoredAudio[] {
  return storedFiles(
    value
  ).map(
    (item, index) => {
      const row =
        Array.isArray(
          value
        )
          ? value[
              index
            ] as Record<
              string,
              unknown
            >
          : {};

      return {
        ...item,
        duration:
          typeof row.duration ===
          "number"
            ? row.duration
            : undefined,
      };
    }
  );
}


export default async function AssignmentPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

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
        instructions,
        due_at,
        max_score,
        allow_late,
        max_attempts,
        is_published
      `)
      .eq(
        "id",
        id
      )
      .eq(
        "is_published",
        true
      )
      .maybeSingle();

  if (
    assignmentError ||
    !assignment
  ) {
    notFound();
  }

  const [
    enrollmentResult,
    courseResult,
    submissionResult,
  ] =
    await Promise.all([
      admin
        .from(
          "enrollments"
        )
        .select("id")
        .eq(
          "course_id",
          assignment.course_id
        )
        .eq(
          "student_id",
          user.id
        )
        .maybeSingle(),

      admin
        .from("courses")
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
          status,
          attempt_number,
          content_json,
          score,
          feedback
        `)
        .eq(
          "assignment_id",
          assignment.id
        )
        .eq(
          "student_id",
          user.id
        )
        .maybeSingle(),
    ]);

  if (
    !enrollmentResult.data
  ) {
    notFound();
  }

  if (
    courseResult.error ||
    !courseResult.data
  ) {
    notFound();
  }

  if (
    submissionResult.error
  ) {
    throw new Error(
      submissionResult.error.message
    );
  }

  const content =
    objectValue(
      submissionResult.data
        ?.content_json
    );

  const files =
    storedFiles(
      content.files
    );

  const audio =
    storedAudio(
      content.audio
    );

  const withSignedUrls =
    async <
      T extends StoredFile
    >(
      items: T[]
    ) =>
      Promise.all(
        items.map(
          async (
            item
          ) => {
            const {
              data,
            } =
              await admin.storage
                .from(
                  "assignment-files"
                )
                .createSignedUrl(
                  item.path,
                  3600
                );

            return {
              ...item,
              url:
                data
                  ?.signedUrl ??
                null,
            };
          }
        )
      );

  const [
    signedFiles,
    signedAudio,
  ] =
    await Promise.all([
      withSignedUrls(
        files
      ),
      withSignedUrls(
        audio
      ),
    ]);

  return (
    <AppShell>
      <AssignmentSubmissionForm
        studentId={
          user.id
        }
        assignment={{
          id:
            assignment.id,

          courseId:
            assignment.course_id,

          courseTitle:
            courseResult.data.title,

          title:
            assignment.title,

          instructions:
            assignment.instructions,

          dueAt:
            assignment.due_at,

          maxScore:
            Number(
              assignment.max_score
            ),

          allowLate:
            assignment.allow_late,

          maxAttempts:
            assignment.max_attempts,
        }}
        submission={{
          status:
            submissionResult.data
              ?.status ??
            null,

          attemptNumber:
            submissionResult.data
              ?.attempt_number ??
            0,

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
                    (item) =>
                      String(
                        item
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
            submissionResult.data
              ?.score ==
            null
              ? null
              : Number(
                  submissionResult.data
                    .score
                ),

          feedback:
            submissionResult.data
              ?.feedback ??
            null,
        }}
      />
    </AppShell>
  );
}
