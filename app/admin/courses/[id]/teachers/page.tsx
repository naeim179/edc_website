import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import AssignTeacherForm from "./AssignTeacherForm";


export default async function CourseTeachersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await params;

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
        className="max-w-4xl mx-auto p-6"
        dir="rtl"
      >

        <h1 className="text-2xl font-bold mb-6">
          إدارة معلمي الدورة
        </h1>


        <AssignTeacherForm
          courseId={id}
          teachers={teachers ?? []}
        />



        <div className="mt-8 bg-white border rounded-xl p-6">


          <h2 className="font-bold mb-4">
            المعلمين الحاليين
          </h2>



          {assignedTeachers?.map((item)=>(

            <div
              key={item.id}
              className="border rounded-lg p-3 mb-2"
            >

              👨‍🏫{" "}
              {item.teacher?.[0]?.full_name ?? "بدون اسم"}

            </div>

          ))}



          {(!assignedTeachers ||
            assignedTeachers.length === 0) && (

            <p className="text-slate-500">
              لا يوجد معلمين معينين
            </p>

          )}


        </div>


      </div>

    </AppShell>
  );
}
