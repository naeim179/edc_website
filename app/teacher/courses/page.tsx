import AppShell from "@/components/AppShell";
import TeacherCoursesContent from "@/components/TeacherCoursesContent";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";

export default async function TeacherCoursesPage() {
  const user = await requireTeacher();

  const supabase = await createClient();

  const { data: assignments } =
    await supabase
      .from("course_instructors")
      .select(`
        id,
        course_id,
        courses (
          id,
          title,
          description,
          course_type,
          price,
          currency,
          sections (
            id,
            lessons (
              id
            )
          )
        )
      `)
      .eq(
        "teacher_id",
        user.id
      );

  return (
    <AppShell>
      <TeacherCoursesContent
        assignments={(assignments ?? []) as any}
      />
    </AppShell>
  );
}
