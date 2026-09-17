import AppShell from "@/components/AppShell";
import Link from "next/link";
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


  // Get every offer of this course assigned to this teacher.
  // Important because the same teacher may manage Group + Private.
  const { data: assignment } =
    await supabase
      .from("course_instructors")
      .select(`
        id
      `)
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


  const totalSections =
    sections?.length ?? 0;


  const totalLessons =
    sections?.reduce(
      (total, section) =>
        total +
        (section.lessons?.length ?? 0),
      0
    ) ?? 0;


  return (
    <AppShell>

      <div
        className="max-w-5xl mx-auto p-6 space-y-6"
        dir="rtl"
      >

        <div>
          <h1 className="text-2xl font-bold">
            إدارة دورة: {course.title}
          </h1>

          <p className="text-slate-500 mt-2">
            {course.description}
          </p>

          <span className="inline-block mt-4 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
            {course.course_type === "group"
              ? "Group - قروب"
              : "Private - خاص"}
          </span>

        </div>


        <div className="grid md:grid-cols-3 gap-4">

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-slate-500">
              الطلاب
            </p>

            <p className="text-3xl font-bold mt-2">
              {studentsCount}
            </p>
          </div>


          <div className="bg-white border rounded-2xl p-5">
            <p className="text-slate-500">
              الأقسام
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalSections}
            </p>
          </div>


          <div className="bg-white border rounded-2xl p-5">
            <p className="text-slate-500">
              الدروس
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalLessons}
            </p>
          </div>

        </div>


        <div className="bg-white border rounded-2xl p-6">

          <h2 className="font-bold mb-4">
            الأقسام والدروس
          </h2>


          <div className="space-y-4">

            {sections?.map((section) => (

              <div
                key={section.id}
                className="border rounded-xl p-4"
              >

                <h3 className="font-bold">
                  {section.title}
                </h3>


                <div className="mt-3 space-y-2">

                  {section.lessons?.map(
                    (lesson) => (

                    <div
                      key={lesson.id}
                      className="bg-slate-50 rounded-lg p-3"
                    >
                      {lesson.title}
                    </div>

                  ))}


                  {(!section.lessons ||
                    section.lessons.length === 0) && (

                    <p className="text-sm text-slate-400">
                      لا توجد دروس في هذا القسم.
                    </p>

                  )}

                </div>

              </div>

            ))}


            {(!sections ||
              sections.length === 0) && (

              <p className="text-slate-500">
                لا يوجد محتوى لهذا النوع حتى الآن.
              </p>

            )}

          </div>

        </div>


        <Link
          href={`/teacher/courses/${id}/sections`}
          className="inline-block bg-[#124b8a] text-white px-5 py-3 rounded-xl font-bold"
        >
          إدارة المحتوى
        </Link>

      </div>

    </AppShell>
  );
}
