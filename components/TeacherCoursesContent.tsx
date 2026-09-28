"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type TeacherCourse = {
  id: string;
  title: string;
  description?: string | null;
  course_type?: string | null;
  price?: number | null;
  currency?: string | null;
  sections?: {
    id: string;
    lessons?: {
      id: string;
    }[];
  }[];
};

type Assignment = {
  id: string;
  courses:
    | TeacherCourse
    | TeacherCourse[]
    | null;
};

export default function TeacherCoursesContent({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const { t } = useLanguage();

  return (
    <div
      className="max-w-5xl mx-auto p-6 space-y-6"
      dir="auto"
    >
      <h1 className="text-2xl font-bold">
        {t.teacher.myCourses}
      </h1>

      <div className="grid md:grid-cols-2 gap-5">
        {assignments.map((item) => {
          const course = Array.isArray(item.courses)
            ? item.courses[0]
            : item.courses;

          if (!course) {
            return null;
          }

          const sections = course.sections ?? [];

          const lessons = sections.reduce(
            (total, section) =>
              total + (section.lessons?.length ?? 0),
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
                    ? t.teacher.group
                    : t.teacher.private}
                </span>
              </div>

              <p className="text-slate-500">
                {course.description ??
                  t.teacher.noDescription}
              </p>

              <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 font-bold text-center">
                {t.teacher.price}:{" "}
                {course.price ?? 0}{" "}
                {course.currency ?? "JOD"}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400">
                    {t.teacher.sections}
                  </p>

                  <p className="font-bold">
                    {sections.length}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400">
                    {t.teacher.lessons}
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
                {t.teacher.manageContent}
              </Link>
            </div>
          );
        })}

        {assignments.length === 0 && (
          <p className="text-slate-500">
            {t.teacher.noCourses}
          </p>
        )}
      </div>
    </div>
  );
}
