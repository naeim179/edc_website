"use client";

import { useLanguage } from "@/components/LanguageProvider";
import CreateSectionForm from "@/app/teacher/courses/[id]/sections/CreateSectionForm";
import CreateLessonForm from "@/app/teacher/courses/[id]/sections/[sectionId]/CreateLessonForm";

type Section = {
  id: string;
  title: string;
  lessons?: {
    id: string;
    title: string;
  }[];
};

export default function TeacherSectionsContent({
  courseId,
  sections,
}: {
  courseId: string;
  sections: Section[];
}) {
  const { t } = useLanguage();

  return (
    <div
      className="mx-auto max-w-5xl p-0 sm:p-6"
      dir="auto"
    >

      <h1 className="text-2xl font-bold mb-6">
        {t.teacher.courseSections}
      </h1>


      <CreateSectionForm
        courseId={courseId}
      />


      <div className="space-y-4">

        {sections.map((section) => (

          <div
            key={section.id}
            className="bg-white border rounded-xl p-5"
          >

            <div className="flex justify-between items-center">

              <h2 className="font-bold">
                {section.title}
              </h2>


              <a
                href={`/teacher/courses/${courseId}/sections/${section.id}/lessons`}
                className="text-[#124b8a] font-bold"
              >
                {t.teacher.manageLessons}
              </a>

            </div>


            <div className="mt-3 space-y-2">

              {section.lessons?.map((lesson) => (

                <div
                  key={lesson.id}
                  className="bg-slate-50 p-3 rounded-lg"
                >
                  {lesson.title}
                </div>

              ))}


              <CreateLessonForm
                courseId={courseId}
                sectionId={section.id}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
