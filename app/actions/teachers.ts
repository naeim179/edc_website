"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Only admins can manage teachers");
  }
}

async function assertTeacher(teacherId: string) {
  const admin = createAdminClient();

  const { data: teacher, error } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!teacher || teacher.role !== "teacher") {
    throw new Error("Teacher not found");
  }
}

export async function createTeacher(formData: FormData) {
  await assertAdmin();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    throw new Error("اسم المعلم مطلوب");
  }

  if (!email) {
    throw new Error("البريد الإلكتروني مطلوب");
  }

  if (password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  const admin = createAdminClient();

  const { data: createdUser, error } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (error || !createdUser.user) {
    throw new Error(
      error?.message ?? "Failed creating teacher"
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role: "teacher",
    })
    .eq("id", createdUser.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/teachers");

  return {
    success: true,
    teacherId: createdUser.user.id,
  };
}

export async function updateTeacherAccount(
  teacherId: string,
  formData: FormData
) {
  await assertAdmin();
  await assertTeacher(teacherId);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    throw new Error("اسم المعلم مطلوب");
  }

  if (!email) {
    throw new Error("البريد الإلكتروني مطلوب");
  }

  if (password && password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  const admin = createAdminClient();

  const { error: authError } =
    await admin.auth.admin.updateUserById(
      teacherId,
      {
        email,
        user_metadata: {
          full_name: fullName,
        },
        ...(password ? { password } : {}),
      }
    );

  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
    })
    .eq("id", teacherId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
}

export async function assignCourseToTeacher(
  teacherId: string,
  formData: FormData
) {
  await assertAdmin();
  await assertTeacher(teacherId);

  const courseId = String(
    formData.get("courseId") ?? ""
  );


  if (!courseId) {
    throw new Error("اختر دورة");
  }


  const admin = createAdminClient();


  const { data: course, error: courseError } =
    await admin
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle();


  if (courseError) {
    throw new Error(courseError.message);
  }


  if (!course) {
    throw new Error("Course not found");
  }


  const { error } =
    await admin
      .from("course_instructors")
      .insert({
        teacher_id: teacherId,
        course_id: courseId,
      });


  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }


  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath(`/admin/courses/${courseId}/teachers`);
}


export async function removeCourseFromTeacher(
  teacherId: string,
  assignmentId: string
) {
  await assertAdmin();
  await assertTeacher(teacherId);

  const admin = createAdminClient();

  const { error } = await admin
    .from("course_instructors")
    .delete()
    .eq("id", assignmentId)
    .eq("teacher_id", teacherId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/teachers/${teacherId}`);
}
