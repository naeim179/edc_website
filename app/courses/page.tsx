import Link from "next/link";

interface Course {
  id: string;
  image: string;
  title: string;
  category?: string;
  instructor: string;
  lessons: number;
  progress: number;
}

const courses: Course[] = [];

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">جميع الدورات</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course: Course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <img src={course.image} alt={course.title} className="w-full h-40 object-cover" />
              <div className="p-4 text-right space-y-2">
                {course.category && (
                  <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {course.category}
                  </span>
                )}
                <h3 className="text-sm font-bold text-slate-800">{course.title}</h3>
                <p className="text-xs text-slate-400">المدرب: {course.instructor}</p>
                <p className="text-xs text-slate-400">{course.lessons} درس</p>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-[#087a54] h-full rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}