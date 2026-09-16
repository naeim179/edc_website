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
  const { data: assignments } =
    await supabase
      .from("course_instructors")
      .select(`
        id,
        offer_id
      `)
      .eq("course_id", id)
      .eq("teacher_id", user.id);


  if (!assignments || assignments.length === 0) {
    return notFound();
  }


  const offerIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.offer_id)
        .filter(
          (offerId): offerId is string =>
            Boolean(offerId)
        )
    )
  );


  // Assignment was verified above.
  // Admin client lets us read management/analytics data reliably.
  const admin = createAdminClient();


  const { data: course } =
    await admin
      .from("courses")
      .select(`
        id,
        title,
        description
      `)
      .eq("id", id)
      .maybeSingle();


  if (!course) {
    return notFound();
  }


  const { data: assignedOffers } =
    offerIds.length > 0
      ? await admin
          .from("course_offers")
          .select(`
            id,
            type
          `)
          .in("id", offerIds)
      : {
          data: [] as {
            id: string;
            type: string;
          }[],
        };


  let sectionsQuery =
    admin
      .from("sections")
      .select(`
        id,
        title,
        offer_id,
        lessons (
          id,
          title
        )
      `)
      .eq("course_id", id)
      .order("order_index");


  // New offer-based assignments only see their own content.
  // Legacy assignments with offer_id = null still see course content.
  if (offerIds.length > 0) {
    sectionsQuery =
      sectionsQuery.in(
        "offer_id",
        offerIds
      );
  }


  const { data: sections } =
    await sectionsQuery;


  let enrollmentsQuery =
    admin
      .from("enrollments")
      .select("student_id")
      .eq("course_id", id);


  if (offerIds.length > 0) {
    enrollmentsQuery =
      enrollmentsQuery.in(
        "offer_id",
        offerIds
      );
  }


  const { data: enrollmentRows } =
    await enrollmentsQuery;


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


          {assignedOffers &&
            assignedOffers.length > 0 && (

            <div className="flex flex-wrap gap-2 mt-4">

              {assignedOffers.map((offer) => (

                <span
                  key={offer.id}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold"
                >
                  {offer.type === "group"
                    ? "Group - قروب"
                    : "Private - خاص"}
                </span>

              ))}

            </div>

          )}
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
