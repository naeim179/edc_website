"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function TeacherLessonsHeader({
  sectionTitle,
}: {
  sectionTitle: string;
}) {
  const { t } = useLanguage();

  return (
    <>
      <a
        className="text-blue-100 font-bold"
        href="javascript:history.back()"
      >
        {t.teacher.backSections}
      </a>

      <h1 className="text-3xl font-bold mt-5">
        {t.teacher.manageLessonsPage}
      </h1>

      <p className="mt-2 text-blue-100">
        {t.teacher.section} {sectionTitle}
      </p>
    </>
  );
}
