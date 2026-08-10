import { notFound } from "next/navigation";
import { courses } from "../lib/mock-courses";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = courses.find((c) => c.id === Number(id));

  if (!course) return notFound();

  return (
    <div className="min-h-screen bg-[#f4f7f6] p-6" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-64 object-cover"
        />

        <div className="p-6 text-right space-y-4">
          {course.category && (
            <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {course.category}
            </span>
          )}

          <h1 className="text-2xl font-bold text-slate-800">
            {course.title}
          </h1>

          <p className="text-sm text-slate-500">
            المدرب: {course.instructor}
          </p>

          <p className="text-sm text-slate-500">
            عدد الدروس: {course.lessons}
          </p>

          {course.description && (
            <p className="text-sm text-slate-600 leading-relaxed">
              {course.description}
            </p>
          )}

          <button className="mt-4 px-6 py-3 bg-[#087a54] hover:bg-[#066b49] text-white font-bold rounded-xl transition-all">
            التسجيل في الدورة
          </button>
        </div>
      </div>
    </div>
  );
}
