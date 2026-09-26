import Link from "next/link";
import AppShell from "@/components/AppShell";
import TeacherProfileForm from "./TeacherProfileForm";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assignCourseToTeacher,
  removeCourseFromTeacher,
  updateTeacherAccount,
} from "@/app/actions/teachers";


export default async function TeacherManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await params;

  const admin = createAdminClient();


  const { data: teacher } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      created_at
    `)
    .eq("id", id)
    .eq("role", "teacher")
    .maybeSingle();


  if (!teacher) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto p-6" dir="rtl">
          <h1 className="text-2xl font-bold">
            المعلم غير موجود
          </h1>
        </div>
      </AppShell>
    );
  }



  const { data: teacherProfile } =
    await admin
      .from("teacher_profiles")
      .select(`
        image_url,
        bio,
        specialization,
        experience_years
      `)
      .eq("user_id", id)
      .maybeSingle();



  const { data: authData } =
    await admin.auth.admin.getUserById(id);


  const email =
    authData.user?.email ?? "";



  const { data: assignments } =
    await admin
      .from("course_instructors")
      .select(`
        id,
        course:courses(
          id,
          title,
          course_type
        )
      `)
      .eq("teacher_id", id);



  console.log("ASSIGNMENTS:", JSON.stringify(assignments, null, 2));

  const { data: allCourses } =
    await admin
      .from("courses")
      .select(`
        id,
        title,
        course_type
      `)
      .order("created_at", {
        ascending:false,
      });



  const assignedCourseIds =
    new Set(
      (assignments ?? [])
        .map(
          (item)=>item.course?.[0]?.id
        )
    );



  const availableCourses =
    (allCourses ?? [])
      .filter(
        (course)=>
          !assignedCourseIds.has(course.id)
      );



  const updateAction =
    updateTeacherAccount.bind(
      null,
      id
    );



  const assignAction =
    assignCourseToTeacher.bind(
      null,
      id
    );



  return (
    <AppShell>

      <div
        className="max-w-5xl mx-auto p-6 space-y-6"
        dir="rtl"
      >


        <div className="flex justify-between">

          <h1 className="text-2xl font-bold">
            إدارة حساب المعلم
          </h1>


          <Link
            href="/admin/teachers"
            className="text-[#124b8a] font-bold"
          >
            العودة
          </Link>

        </div>



        <TeacherProfileForm
          teacherId={id}
          profile={teacherProfile}
        />



        <form
          action={updateAction}
          className="bg-white border rounded-2xl p-6 space-y-4"
        >

          <h2 className="font-bold text-lg">
            معلومات الحساب
          </h2>


          <input
            name="fullName"
            defaultValue={teacher.full_name ?? ""}
            className="w-full border rounded-xl px-4 py-3"
            placeholder="الاسم"
          />


          <input
            name="email"
            defaultValue={email}
            className="w-full border rounded-xl px-4 py-3"
            placeholder="Email"
          />


          <input
            name="password"
            type="password"
            placeholder="كلمة مرور جديدة"
            className="w-full border rounded-xl px-4 py-3"
          />


          <button
            className="bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
          >
            حفظ
          </button>


        </form>




        <div className="bg-white border rounded-2xl p-6">


          <h2 className="font-bold mb-4">
            الدورات المعينة للمعلم
          </h2>


          <div className="space-y-3">


          {assignments?.map((item)=>{

            const course = Array.isArray(item.course)
              ? item.course[0]
              : item.course;

            return (

            <div
              key={item.id}
              className="border rounded-xl p-4 flex justify-between"
            >

              <span className="font-bold">

                {course?.title}

                {" - "}

                {
                  course?.course_type === "group"
                  ? "Group"
                  : "Private"
                }

              </span>



              <form
                action={
                  removeCourseFromTeacher.bind(
                    null,
                    id,
                    item.id
                  )
                }
              >

                <button
                  className="text-red-600 font-bold"
                >
                  إزالة
                </button>


              </form>


            </div>

          )
          })}


          </div>


        </div>




        <form
          action={assignAction}
          className="bg-white border rounded-2xl p-6"
        >


          <h2 className="font-bold mb-4">
            إضافة دورة للمعلم
          </h2>



          <select
            name="courseId"
            required
            className="w-full border rounded-xl px-4 py-3 mb-4"
          >

            <option value="">
              اختر الدورة
            </option>



            {availableCourses.map((course)=>(

              <option
                key={course.id}
                value={course.id}
              >

                {course.title}

                {" - "}

                {
                  course.course_type === "group"
                  ? "Group"
                  : "Private"
                }

              </option>

            ))}


          </select>



          <button
            className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
          >
            إضافة
          </button>


        </form>



      </div>

    </AppShell>
  );
}
