import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  let role: string | null = null;
  let enrolledCount = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    fullName = profile?.full_name ?? null;
    role = profile?.role ?? null;

    if (role === "admin") {
      redirect("/admin");
    }

    if (role === "teacher") {
      redirect("/teacher/courses");
    }

    const { count } = await supabase
      .from("enrollments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("student_id", user.id);

    enrolledCount = count ?? 0;
  }

  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      category,
      image_url,
      price,
      currency,
      is_free,
      sections (
        lessons (
          id
        )
      )
    `)
    .eq("is_published", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (error) {
    throw new Error(
      `Failed to load courses: ${error.message}`
    );
  }

  // التقدم الحقيقي للطالب في كل دورة
  const enrolledCourseIds = new Set<string>();
  const completedByCourse = new Map<string, number>();

  if (user) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, course_id")
      .eq("student_id", user.id);

    const enrollmentIds = (enrollments ?? []).map((e) => e.id);
    let progressRows: { enrollment_id: string }[] = [];

    if (enrollmentIds.length > 0) {
      const { data } = await supabase
        .from("lesson_progress")
        .select("enrollment_id")
        .in("enrollment_id", enrollmentIds)
        .eq("is_completed", true);

      progressRows = data ?? [];
    }

    for (const e of enrollments ?? []) {
      enrolledCourseIds.add(e.course_id);
      completedByCourse.set(
        e.course_id,
        progressRows.filter((r) => r.enrollment_id === e.id).length
      );
    }
  }

  const mappedCourses =
    courses?.map((course) => {
      const lessonsCount =
        course.sections?.reduce(
          (total, section) =>
            total +
            (section.lessons?.length ?? 0),
          0
        ) ?? 0;

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        image: course.image_url,
        lessons: lessonsCount,
        price: course.price,
        currency: course.currency,
        isFree: course.is_free,
      };
    }) ?? [];

  const displayName =
    fullName?.trim() ||
    user?.email?.split("@")[0] ||
    "طالب";

  return (
    <AppShell>
      {user ? (
        <section className="rounded-[24px] bg-gradient-to-l from-[#124b8a] to-[#0d3b6e] text-white p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div className="text-right">
              <p className="text-blue-100 text-sm mb-2">
                أهلاً بعودتك
              </p>

              <h1 className="text-3xl font-bold">
                مرحباً {displayName} 👋
              </h1>

              <p className="mt-3 text-blue-100">
                أكمل رحلتك التعليمية من حيث توقفت.
              </p>

              <Link
                href="/my-courses"
                className="inline-block mt-6 bg-white text-[#124b8a] px-6 py-3 rounded-xl font-bold"
              >
                متابعة التعلم
              </Link>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 min-w-44 text-center">
              <p className="text-3xl font-bold">
                {enrolledCount}
              </p>

              <p className="text-sm text-blue-100 mt-1">
                دورات مسجلة
              </p>
            </div>

          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-gradient-to-l from-[#124b8a] to-[#0d3b6e] text-white p-8 shadow-lg">
          <div className="max-w-2xl mr-auto text-right">
            <p className="text-blue-100 text-sm mb-2">
              منصتك للتعلم والتطور
            </p>

            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              ابدأ رحلتك التعليمية اليوم
            </h1>

            <p className="mt-4 text-blue-100 leading-7">
              استعرض الدورات المتاحة، أنشئ حسابك،
              وتابع تقدمك من مكان واحد.
            </p>

            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <Link
                href="/register"
                className="bg-white text-[#124b8a] px-6 py-3 rounded-xl font-bold"
              >
                إنشاء حساب
              </Link>

              <Link
                href="/courses"
                className="border border-white/40 px-6 py-3 rounded-xl font-bold hover:bg-white/10"
              >
                استعراض الدورات
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/courses"
            className="text-sm font-semibold text-[#124b8a] hover:underline"
          >
            عرض جميع الدورات
          </Link>

          <h2 className="text-xl font-bold text-slate-800">
            الدورات المتاحة
          </h2>
        </div>

        {mappedCourses.length > 0 ? (
          user ? (
            <div className="space-y-3">
              {mappedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  category={
                    course.category ?? "عام"
                  }
                  progress={
                    course.lessons > 0
                      ? Math.min(
                          100,
                          Math.round(
                            ((completedByCourse.get(course.id) ?? 0) /
                              course.lessons) *
                              100
                          )
                        )
                      : 0
                  }
                  completedLessons={completedByCourse.get(course.id) ?? 0}
                  totalLessons={course.lessons}
                  enrolled={enrolledCourseIds.has(course.id)}
                  image={course.image}
                />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mappedCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition"
                >
                  <div className="text-right">
                    {course.category && (
                      <span className="text-xs text-[#124b8a] font-bold">
                        {course.category}
                      </span>
                    )}

                    <h3 className="font-bold text-slate-800 mt-2">
                      {course.title}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">
                      {course.lessons} درس
                    </p>

                    <p className="mt-4 font-bold text-[#124b8a]">
                      {course.isFree
                        ? "مجانية"
                        : `${course.price ?? 0} ${
                            course.currency ?? "JOD"
                          }`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
            لا توجد دورات منشورة حاليًا.
          </div>
        )}
      </section>
    </AppShell>
  );
}
