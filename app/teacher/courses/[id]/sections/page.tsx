import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { notFound } from "next/navigation";
import CreateSectionForm from "./CreateSectionForm";
import CreateLessonForm from "./[sectionId]/CreateLessonForm";


export default async function TeacherSectionsPage({
  params,
}: {
  params: Promise<{id:string}>;
}) {


  const user = await requireTeacher();

  const { id } = await params;

  const supabase = await createClient();



  const { data: assignment } =
    await supabase
      .from("course_instructors")
      .select("course_id")
      .eq(
        "course_id",
        id
      )
      .eq(
        "teacher_id",
        user.id
      )
      .maybeSingle();



  if(!assignment){
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
      .eq(
        "course_id",
        id
      )
      .order(
        "order_index"
      );



  return (

    <AppShell>

      <div
        className="max-w-5xl mx-auto p-6"
        dir="rtl"
      >

        <h1 className="text-2xl font-bold mb-6">
          أقسام الدورة
        </h1>


        <CreateSectionForm
          courseId={id}
        />


        <div className="space-y-4">


          {sections?.map((section)=>(

            <div
              key={section.id}
              className="bg-white border rounded-xl p-5"
            >

              <div className="flex justify-between items-center">

                <h2 className="font-bold">
                  {section.title}
                </h2>


                <a
                  href={`/teacher/courses/${id}/sections/${section.id}/lessons`}
                  className="text-[#124b8a] font-bold"
                >
                  إدارة الدروس
                </a>

              </div>


              <div className="mt-3 space-y-2">

                {section.lessons?.map((lesson)=>(

                  <div
                    key={lesson.id}
                    className="bg-slate-50 p-3 rounded-lg"
                  >
                    {lesson.title}
                  </div>

                ))}


                <CreateLessonForm
                  courseId={id}
                  sectionId={section.id}
                />


              </div>


            </div>

          ))}


        </div>


      </div>

    </AppShell>

  );

}
