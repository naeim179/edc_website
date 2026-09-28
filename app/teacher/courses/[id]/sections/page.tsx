import AppShell from "@/components/AppShell";
import TeacherSectionsContent from "@/components/TeacherSectionsContent";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { notFound } from "next/navigation";


export default async function TeacherSectionsPage({
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
      .select("course_id")
      .eq("course_id", id)
      .eq("teacher_id", user.id)
      .maybeSingle();


  if (!assignment) {
    return notFound();
  }


  const { data: sections } =
    await supabase
      .from("sections")
      .select(`
        id,
        title,
        lessons(
          id,
          title
        )
      `)
      .eq("course_id", id)
      .order("order_index");


  return (
    <AppShell>
      <TeacherSectionsContent
        courseId={id}
        sections={sections ?? []}
      />
    </AppShell>
  );
}
