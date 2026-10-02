"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth/admin-access";

async function assertTeacher(
  teacherId: string
) {
  if (!teacherId) {
    throw new Error(
      "معرّف المدرس غير صالح"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: teacher,
    error,
  } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    !teacher ||
    teacher.role !== "teacher"
  ) {
    throw new Error(
      "المدرس غير موجود"
    );
  }

  return admin;
}

export async function createTeacher(
  formData: FormData
) {
  await requirePermission(
    "manage_teachers"
  );

  const fullName =
    String(
      formData.get(
        "fullName"
      ) ?? ""
    ).trim();

  const email =
    String(
      formData.get(
        "email"
      ) ?? ""
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      formData.get(
        "password"
      ) ?? ""
    );

  if (!fullName) {
    throw new Error(
      "اسم المدرس مطلوب"
    );
  }

  if (!email) {
    throw new Error(
      "البريد الإلكتروني مطلوب"
    );
  }

  if (
    password.length < 6
  ) {
    throw new Error(
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: createdUser,
    error,
  } =
    await admin.auth.admin.createUser(
      {
        email,
        password,
        email_confirm: true,

        user_metadata: {
          full_name:
            fullName,
        },
      }
    );

  if (
    error ||
    !createdUser.user
  ) {
    throw new Error(
      error?.message ??
        "تعذر إنشاء حساب المدرس"
    );
  }

  const {
    error: profileError,
  } = await admin
    .from("profiles")
    .update({
      full_name:
        fullName,

      role: "teacher",
    })
    .eq(
      "id",
      createdUser.user.id
    );

  if (profileError) {
    await admin.auth.admin.deleteUser(
      createdUser.user.id
    );

    throw new Error(
      profileError.message
    );
  }

  revalidatePath(
    "/admin/teachers"
  );

  return {
    success: true,
    teacherId:
      createdUser.user.id,
  };
}

export async function updateTeacherAccount(
  teacherId: string,
  formData: FormData
) {
  await requirePermission(
    "manage_teachers"
  );

  const admin =
    await assertTeacher(
      teacherId
    );

  const fullName =
    String(
      formData.get(
        "fullName"
      ) ?? ""
    ).trim();

  const email =
    String(
      formData.get(
        "email"
      ) ?? ""
    )
      .trim()
      .toLowerCase();

  const phone =
    String(
      formData.get(
        "phone"
      ) ?? ""
    ).trim();

  const password =
    String(
      formData.get(
        "password"
      ) ?? ""
    );

  if (!fullName) {
    throw new Error(
      "اسم المدرس مطلوب"
    );
  }

  if (!email) {
    throw new Error(
      "البريد الإلكتروني مطلوب"
    );
  }

  if (
    password &&
    password.length < 6
  ) {
    throw new Error(
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    );
  }

  const {
    error: authError,
  } =
    await admin.auth.admin.updateUserById(
      teacherId,
      {
        email,

        user_metadata: {
          full_name:
            fullName,
        },

        ...(password
          ? { password }
          : {}),
      }
    );

  if (authError) {
    throw new Error(
      authError.message
    );
  }

  const {
    error: profileError,
  } = await admin
    .from("profiles")
    .update({
      full_name:
        fullName,

      phone:
        phone || null,
    })
    .eq(
      "id",
      teacherId
    );

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  revalidatePath(
    "/admin/teachers"
  );

  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  revalidatePath(
    "/teacher/profile"
  );

  return {
    success: true,
  };
}

export async function assignCourseToTeacher(
  teacherId: string,
  formData: FormData
) {
  await requirePermission(
    "manage_teachers"
  );

  const admin =
    await assertTeacher(
      teacherId
    );

  const courseId =
    String(
      formData.get(
        "courseId"
      ) ?? ""
    );

  if (!courseId) {
    throw new Error(
      "اختر دورة"
    );
  }

  const {
    data: course,
    error: courseError,
  } = await admin
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    throw new Error(
      courseError.message
    );
  }

  if (!course) {
    throw new Error(
      "الدورة غير موجودة"
    );
  }

  /*
   * Application-level protection.
   * A course may have ONE teacher only.
   */
  const {
    data: existingAssignments,
    error: existingError,
  } = await admin
    .from(
      "course_instructors"
    )
    .select(
      "id, teacher_id"
    )
    .eq(
      "course_id",
      courseId
    )
    .limit(1);

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  const existing =
    existingAssignments?.[0] ??
    null;

  if (existing) {
    if (
      existing.teacher_id ===
      teacherId
    ) {
      throw new Error(
        "هذه الدورة معيّنة لهذا المدرس بالفعل"
      );
    }

    throw new Error(
      "هذه الدورة معيّنة لمدرس آخر بالفعل. أزل المدرس الحالي أولاً."
    );
  }

  const {
    error,
  } = await admin
    .from(
      "course_instructors"
    )
    .insert({
      teacher_id:
        teacherId,

      course_id:
        courseId,
    });

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "هذه الدورة معيّنة لمدرس آخر بالفعل"
      );
    }

    throw new Error(
      error.message
    );
  }

  /*
   * If students were already enrolled before a teacher
   * was assigned, make sure their course conversation
   * exists immediately.
   */
  const {
    data: enrolledStudents,
    error: enrolledStudentsError,
  } = await admin
    .from("enrollments")
    .select("student_id")
    .eq(
      "course_id",
      courseId
    );

  if (enrolledStudentsError) {
    console.error(
      "Failed to load enrolled students for chat sync:",
      enrolledStudentsError.message
    );
  } else {
    for (
      const enrollment
      of enrolledStudents ?? []
    ) {
      const {
        error: conversationError,
      } = await admin.rpc(
        "start_conversation_for_student",
        {
          p_student_id:
            enrollment.student_id,

          p_course_id:
            courseId,

          p_teacher_id:
            teacherId,
        }
      );

      if (
        conversationError
      ) {
        console.error(
          "Failed to sync course conversation:",
          conversationError.message
        );
      }
    }
  }

  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  revalidatePath(
    `/admin/courses/${courseId}/teachers`
  );

  revalidatePath(
    "/admin/teachers"
  );

  return {
    success: true,
  };
}


export async function removeCourseFromTeacher(
  teacherId: string,
  assignmentId: string
) {
  await requirePermission(
    "manage_teachers"
  );

  const admin =
    await assertTeacher(
      teacherId
    );

  const { error } =
    await admin
      .from(
        "course_instructors"
      )
      .delete()
      .eq(
        "id",
        assignmentId
      )
      .eq(
        "teacher_id",
        teacherId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  return {
    success: true,
  };
}

export async function setTeacherBlocked(
  teacherId: string,
  shouldBlock: boolean
) {
  await requirePermission(
    "manage_teachers"
  );

  const admin =
    await assertTeacher(
      teacherId
    );

  const {
    error,
  } =
    await admin.auth.admin.updateUserById(
      teacherId,
      {
        ban_duration:
          shouldBlock
            ? "876000h"
            : "none",
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/teachers"
  );

  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  revalidatePath(
    "/",
    "layout"
  );

  return {
    success: true,
  };
}

export async function deleteTeacherAccount(
  teacherId: string,
  confirmation: string
) {
  await requireSuperAdmin();

  if (
    confirmation !==
    "DELETE"
  ) {
    throw new Error(
      "اكتب DELETE لتأكيد الحذف"
    );
  }

  const admin =
    await assertTeacher(
      teacherId
    );

  const {
    error,
  } =
    await admin.auth.admin.deleteUser(
      teacherId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/teachers"
  );

  return {
    success: true,
  };
}
