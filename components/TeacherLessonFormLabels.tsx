"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function TeacherLessonFormLabels() {
  const { t } = useLanguage();

  return (
    <>
      <h2 className="font-bold text-lg">
        {t.teacher.addNewLesson}
      </h2>
    </>
  );
}
