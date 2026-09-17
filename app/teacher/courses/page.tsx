import AppShell from "@/components/AppShell";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";


export default async function TeacherCoursesPage(){

  const user =
    await requireTeacher();


  const supabase =
    await createClient();



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

      <div
        className="max-w-5xl mx-auto p-6 space-y-6"
        dir="rtl"
      >

        <h1 className="text-2xl font-bold">
          دوراتي كمدرس
        </h1>



        <div className="grid md:grid-cols-2 gap-5">


          {assignments?.map((item)=>{


            const course =
              item.courses?.[0];


            if(!course){
              return null;
            }


            const sections =
              course.sections ?? [];


            const lessons =
              sections.reduce(
                (total,section)=>
                  total +
                  (section.lessons?.length ?? 0),
                0
              );




            return (

              <div
                key={item.id}
                className="bg-white border rounded-2xl p-5 space-y-4"
              >


                <div className="flex justify-between items-start">

                  <h2 className="font-bold text-lg">
                    {course.title}
                  </h2>


                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {course.course_type === "group"
                      ? "Group"
                      : "Private"}
                  </span>

                </div>



                <p className="text-slate-500">
                  {course.description}
                </p>



                <div className="grid grid-cols-2 gap-3">

                  <div className="bg-slate-50 rounded-xl p-3 text-center">

                    <p className="text-xs text-slate-400">
                      الأقسام
                    </p>

                    <p className="font-bold">
                      {sections.length}
                    </p>

                  </div>


                  <div className="bg-slate-50 rounded-xl p-3 text-center">

                    <p className="text-xs text-slate-400">
                      الدروس
                    </p>

                    <p className="font-bold">
                      {lessons}
                    </p>

                  </div>

                </div>



                <Link
                  href={`/teacher/courses/${course.id}`}
                  className="block text-center bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold"
                >
                  إدارة المحتوى
                </Link>


              </div>

            );


          })}



          {(!assignments ||
            assignments.length === 0) && (

            <p className="text-slate-500">
              لا توجد دورات معينة لك حالياً.
            </p>

          )}


        </div>


      </div>

    </AppShell>

  );

}
