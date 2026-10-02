import {
  notFound,
} from "next/navigation";

import AppShell from "@/components/AppShell";
import TeacherAdminManager from "@/components/admin/TeacherAdminManager";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  requirePermission,
} from "@/lib/auth/admin-access";


type CourseInfo = {
  id: string;
  title: string;

  course_type:
    | "group"
    | "private";

  is_published:
    | boolean
    | null;

  enrollments:
    | {
        id: string;
        student_id: string;
      }[]
    | null;
};


type RawAssignment = {
  id: string;

  course:
    | CourseInfo
    | CourseInfo[]
    | null;
};


function relationOne<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}


export default async function TeacherManagePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const access =
    await requirePermission(
      "manage_teachers"
    );

  const { id } =
    await params;

  const admin =
    createAdminClient();

  /*
   * Normal authenticated admin client is used for conversations,
   * because the chat table access is already protected by RLS.
   */
  const supabase =
    await createClient();


  const {
    data: teacher,
    error: teacherError,
  } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      role,
      created_at,
      avatar_url
    `)
    .eq(
      "id",
      id
    )
    .eq(
      "role",
      "teacher"
    )
    .maybeSingle();


  if (teacherError) {
    throw new Error(
      teacherError.message
    );
  }


  if (!teacher) {
    notFound();
  }


  const [
    profileResult,
    authResult,
    assignmentsResult,
    coursesResult,
    allAssignmentsResult,
    conversationsResult,
  ] = await Promise.all([
    admin
      .from(
        "teacher_profiles"
      )
      .select(`
        image_url,
        bio,
        specialization,
        experience_years
      `)
      .eq(
        "user_id",
        id
      )
      .maybeSingle(),

    admin.auth.admin
      .getUserById(
        id
      ),

    admin
      .from(
        "course_instructors"
      )
      .select(`
        id,

        course:courses (
          id,
          title,
          course_type,
          is_published,

          enrollments (
            id,
            student_id
          )
        )
      `)
      .eq(
        "teacher_id",
        id
      ),

    admin
      .from("courses")
      .select(`
        id,
        title,
        course_type,
        is_published
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      ),

    /*
     * All assignments on the platform.
     * Used to prevent a course assigned to Teacher A
     * from appearing in Teacher B's selector.
     */
    admin
      .from(
        "course_instructors"
      )
      .select(
        "course_id"
      ),

    supabase
      .from(
        "conversations"
      )
      .select(
        "id",
        {
          count:
            "exact",
          head: true,
        }
      )
      .eq(
        "teacher_id",
        id
      ),
  ]);


  if (
    profileResult.error
  ) {
    throw new Error(
      profileResult.error.message
    );
  }


  if (
    authResult.error
  ) {
    throw new Error(
      authResult.error.message
    );
  }


  if (
    assignmentsResult.error
  ) {
    throw new Error(
      assignmentsResult.error.message
    );
  }


  if (
    coursesResult.error
  ) {
    throw new Error(
      coursesResult.error.message
    );
  }


  if (
    allAssignmentsResult.error
  ) {
    throw new Error(
      allAssignmentsResult.error.message
    );
  }


  if (
    conversationsResult.error
  ) {
    console.error(
      "Teacher conversations count error:",
      conversationsResult.error
    );
  }


  const authUser =
    authResult.data.user as
      typeof authResult.data.user & {
        banned_until?:
          | string
          | null;
      };


  const bannedUntil =
    authUser.banned_until ??
    null;


  const isBanned =
    Boolean(
      bannedUntil &&
      new Date(
        bannedUntil
      ).getTime() >
        Date.now()
    );


  /*
   * Supabase relations can be returned as an object OR array
   * depending on inferred relationship cardinality.
   */
  const assignments =
    (
      (
        assignmentsResult.data ??
        []
      ) as unknown as RawAssignment[]
    )
      .map(
        (item) => {
          const course =
            relationOne(
              item.course
            );

          if (!course) {
            return null;
          }

          return {
            id:
              item.id,

            courseId:
              course.id,

            title:
              course.title,

            courseType:
              course.course_type,

            isPublished:
              Boolean(
                course.is_published
              ),

            studentsCount:
              course
                .enrollments
                ?.length ??
              0,

            studentIds:
              (
                course.enrollments ??
                []
              ).map(
                (
                  enrollment
                ) =>
                  enrollment.student_id
              ),
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          item !== null
      );


  /*
   * Every course already assigned to ANY teacher.
   * These courses must not appear in the add-course selector.
   */
  const globallyAssignedCourseIds =
    new Set(
      (
        allAssignmentsResult.data ??
        []
      ).map(
        (
          assignment
        ) =>
          assignment.course_id
      )
    );


  const availableCourses =
    (
      coursesResult.data ??
      []
    ).filter(
      (
        course
      ) =>
        !globallyAssignedCourseIds.has(
          course.id
        )
    );


  const studentIds =
    new Set(
      assignments.flatMap(
        (
          assignment
        ) =>
          assignment.studentIds
      )
    );


  const profile =
    profileResult.data;


  return (
    <AppShell>
      <TeacherAdminManager
        teacher={{
          id:
            teacher.id,

          fullName:
            teacher.full_name,

          email:
            authUser.email ??
            "",

          phone:
            teacher.phone,

          createdAt:
            teacher.created_at,

          lastSignInAt:
            authUser.last_sign_in_at ??
            null,
        }}
        profile={{
          imageUrl:
            profile?.image_url ??
            teacher.avatar_url ??
            null,

          specialization:
            profile?.specialization ??
            null,

          experienceYears:
            profile?.experience_years ??
            0,

          bio:
            profile?.bio ??
            null,
        }}
        assignments={
          assignments.map(
            ({
              studentIds:
                _studentIds,
              ...assignment
            }) =>
              assignment
          )
        }
        availableCourses={
          availableCourses.map(
            (
              course
            ) => ({
              id:
                course.id,

              title:
                course.title,

              courseType:
                course.course_type as
                  | "group"
                  | "private",

              isPublished:
                Boolean(
                  course.is_published
                ),
            })
          )
        }
        stats={{
          courses:
            assignments.length,

          students:
            studentIds.size,

          conversations:
            conversationsResult.count ??
            0,
        }}
        isBanned={
          isBanned
        }
        bannedUntil={
          bannedUntil
        }
        canDeleteTeacher={
          access.isSuper
        }
        canManageCourses={
          access.isSuper ||
          access.permissions.includes(
            "manage_courses"
          )
        }
      />
    </AppShell>
  );
}
