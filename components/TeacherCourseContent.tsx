"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type Section = {
  id: string;
  title: string;
  lessons?: {
    id: string;
    title: string;
  }[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  course_type?: string | null;
};

export default function TeacherCourseContent({
  id,
  course,
  sections,
  studentsCount,
}: {
  id: string;
  course: Course;
  sections: Section[];
  studentsCount: number;
}) {
  const { t } = useLanguage();

  const totalSections = sections.length;

  const totalLessons = sections.reduce(
    (total, section) =>
      total + (section.lessons?.length ?? 0),
    0
  );

  return (
    <div
      className="max-w-5xl mx-auto p-6 space-y-6"
      dir="auto"
    >
      <div>
        <h1 className="text-2xl font-bold">
          {t.teacher.manageCourse}: {course.title}
        </h1>

        <p className="text-slate-500 mt-2">
          {course.description ?? t.teacher.noDescription}
        </p>

        <span className="inline-block mt-4 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
          {course.course_type === "group"
            ? t.teacher.group
            : t.teacher.private}
        </span>
      </div>


      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            {t.teacher.students}
          </p>

          <p className="text-3xl font-bold mt-2">
            {studentsCount}
          </p>
        </div>


        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            {t.teacher.sections}
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalSections}
          </p>
        </div>


        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            {t.teacher.lessons}
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalLessons}
          </p>
        </div>

      </div>


      <div className="bg-white border rounded-2xl p-6">

        <h2 className="font-bold mb-4">
          {t.teacher.sectionsLessons}
        </h2>


        <div className="space-y-4">

          {sections.map((section) => (
            <div
              key={section.id}
              className="border rounded-xl p-4"
            >

              <h3 className="font-bold">
                {section.title}
              </h3>


              <div className="mt-3 space-y-2">

                {section.lessons?.map((lesson) => (
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
                    {t.teacher.noLessons}
                  </p>
                )}

              </div>

            </div>
          ))}


          {sections.length === 0 && (
            <p className="text-slate-500">
              {t.teacher.noContent}
            </p>
          )}

        </div>

      </div>


      <Link
        href={`/teacher/courses/${id}/sections`}
        className="inline-block bg-[#124b8a] text-white px-5 py-3 rounded-xl font-bold"
      >
        {t.teacher.manageContent}
      </Link>

    </div>
  );
}
