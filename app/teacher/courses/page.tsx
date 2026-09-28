import AppShell from "@/components/AppShell";
import TeacherCoursesContent from "@/components/TeacherCoursesContent";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";


type TeacherAssignment = {
  id: string;
  course_id: string;
  courses: {
    id: string;
    title: string;
    description: string | null;
    course_type: string | null;
    price: number | null;
    currency: string | null;
    sections: {
      id: string;
      lessons: {
        id: string;
      }[];
    }[];
  }[];
};

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
        assignments={(assignments ?? []) as TeacherAssignment[]}
      />
    </AppShell>
  );
}
