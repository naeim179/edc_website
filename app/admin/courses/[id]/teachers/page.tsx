import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import AssignTeacherForm from "./AssignTeacherForm";
import { translations } from "@/lib/i18n";


export default async function CourseTeachersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await params;
  const t = translations.ar;

  const supabase = await createClient();


  const { data: teachers } =
    await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("created_at", {
        ascending: false,
      });



  const { data: assignedTeachers } =
    await supabase
      .from("course_instructors")
      .select(`
        id,
        teacher:profiles (
          full_name
        )
      `)
      .eq("course_id", id);



  return (
    <AppShell>

      <div
        className="mx-auto max-w-4xl p-0 sm:p-6"
        dir="rtl"
      >

        <h1 className="text-2xl font-bold mb-6">
          {t.admin.manageTeachers}
        </h1>


        <AssignTeacherForm
          courseId={id}
          teachers={teachers ?? []}
        />



        <div className="mt-8 bg-white border rounded-xl p-6">


          <h2 className="font-bold mb-4">
            {t.admin.currentTeachers}
          </h2>



          {assignedTeachers?.map((item)=>(

            <div
              key={item.id}
              className="border rounded-lg p-3 mb-2"
            >

              👨‍🏫{" "}
              {item.teacher?.[0]?.full_name ?? t.admin.noName}

            </div>

          ))}



          {(!assignedTeachers ||
            assignedTeachers.length === 0) && (

            <p className="text-slate-500">
              {t.admin.noAssignedTeachers}
            </p>

          )}


        </div>


      </div>

    </AppShell>
  );
}
