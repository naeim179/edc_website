"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type TeacherCourse = {
  id: string;
  title: string;
  description?: string | null;
};

export default function TeacherDashboardContent({
  courses,
}: {
  courses: TeacherCourse[];
}) {
  const { t } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto p-6" dir="auto">
      <h1 className="text-2xl font-bold mb-6">
        {t.teacher.myCourses}
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white border rounded-xl p-6"
          >
            <h2 className="font-bold text-lg">
              {course.title}
            </h2>

            <p className="text-slate-500 mt-2">
              {course.description ?? t.teacher.noDescription}
            </p>

            <Link
              href={`/teacher/courses/${course.id}`}
              className="inline-block mt-4 bg-[#087a54] text-white px-5 py-2 rounded-lg font-bold"
            >
              {t.teacher.manageLessons}
            </Link>
          </div>
        ))}

        {courses.length === 0 && (
          <p className="text-slate-500">
            {t.teacher.noCourses}
          </p>
        )}
      </div>
    </div>
  );
}
