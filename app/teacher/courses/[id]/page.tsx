import AppShell from "@/components/AppShell";
import TeacherCourseContent from "@/components/TeacherCourseContent";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth/require-teacher";


export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const user = await requireTeacher();

  const { id } = await params;

  const supabase = await createClient();


  const { data: assignment } =
    await supabase
      .from("course_instructors")
      .select("id")
      .eq("course_id", id)
      .eq("teacher_id", user.id)
      .maybeSingle();


  if (!assignment) {
    return notFound();
  }


  const admin = createAdminClient();


  const { data: course } =
    await admin
      .from("courses")
      .select(`
        id,
        title,
        description,
        course_type,
        price,
        currency
      `)
      .eq("id", id)
      .maybeSingle();


  if (!course) {
    return notFound();
  }


  const { data: sections } =
    await admin
      .from("sections")
      .select(`
        id,
        title,
        lessons (
          id,
          title
        )
      `)
      .eq("course_id", id)
      .order("order_index");


  const { data: enrollmentRows } =
    await admin
      .from("enrollments")
      .select("student_id")
      .eq("course_id", id);


  const studentsCount =
    new Set(
      (enrollmentRows ?? []).map(
        (row) => row.student_id
      )
    ).size;


  return (
    <AppShell>
      <TeacherCourseContent
        id={id}
        course={course}
        sections={sections ?? []}
        studentsCount={studentsCount}
      />
    </AppShell>
  );
}
