import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getTeacherCourses, type TeacherCourse } from "@/lib/teacher-courses";

export default async function TeacherPage() {
  await requireTeacher();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let courses: TeacherCourse[];
  try {
    courses = await getTeacherCourses(supabase, user.id);
  } catch {
    courses = [];
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">دوراتي التعليمية</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white border rounded-xl p-6">
              <h2 className="font-bold text-lg">{course.title}</h2>
              <p className="text-slate-500 mt-2">
                {course.description ?? "لا يوجد وصف للدورة"}
              </p>
              <Link
                href={`/teacher/courses/${course.id}`}
                className="inline-block mt-4 bg-[#087a54] text-white px-5 py-2 rounded-lg font-bold"
              >
                إدارة الدروس
              </Link>
            </div>
          ))}

          {courses.length === 0 && (
            <p className="text-slate-500">لا يوجد دورات معينة لك حاليا</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
