import CourseCatalogCard from "@/components/CourseCatalogCard";
import { courses } from "./lib/mock-courses";

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          جميع الدورات
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <CourseCatalogCard
              key={course.id}
              id={course.id}
              title={course.title}
              instructor={course.instructor}
              category={course.category}
              lessons={course.lessons}
              progress={course.progress}
              image={course.image}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
