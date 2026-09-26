"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CheckCircleIcon,
  LockIcon,
  PlayIcon,
} from "@/components/icons";
import { formatLessons } from "@/lib/course-format";

type LessonSidebarProps = {
  courseId: string;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      isFreePreview?: boolean;
    }[];
  }[];
  currentLessonId: string;
  completedLessonIds: string[];
  /** false = زائر أو غير مسجل: الدروس غير المجانية تظهر مقفلة */
  isEnrolled?: boolean;
};

export default function CourseLessonSidebar({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
  isEnrolled = true,
}: LessonSidebarProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const completed = new Set(completedLessonIds);

  const allLessons = sections.flatMap((section) => section.lessons);
  const totalLessons = allLessons.length;

  const completedCount = allLessons.filter((lesson) =>
    completed.has(lesson.id)
  ).length;

  const progress =
    totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
    >
      <h2 className="text-lg font-bold text-slate-800">
        {isArabic ? "محتوى الدورة" : "Course content"}
      </h2>

      {isEnrolled && (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {isArabic ? "تقدمك" : "Your progress"}
            </span>

            <span className="font-bold text-[#124b8a]">
              {progress}%
            </span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[#ffffff]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[#124b8a] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {isArabic
              ? `${completedCount} من ${totalLessons} درس مكتمل`
              : `${completedCount} of ${totalLessons} lessons completed`}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-700">
                {section.title}
              </h3>

              <span className="shrink-0 text-xs text-slate-400">
                {formatLessons(section.lessons.length, isArabic)}
              </span>
            </div>

            <ul className="space-y-1.5">
              {section.lessons.map((lesson) => {
                const isDone = completed.has(lesson.id);
                const isCurrent = currentLessonId === lesson.id;
                const locked =
                  !isEnrolled && !lesson.isFreePreview;

                const rowClass = `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                  isCurrent
                    ? "border border-blue-100 bg-blue-50 font-bold text-[#124b8a]"
                    : locked
                    ? "bg-slate-50 text-slate-400"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`;

                const icon = isDone ? (
                  <CheckCircleIcon
                    width={20}
                    height={20}
                    className="text-emerald-600"
                  />
                ) : isCurrent ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#124b8a] text-white">
                    <PlayIcon width={9} height={9} />
                  </span>
                ) : locked ? (
                  <LockIcon
                    width={18}
                    height={18}
                    className="text-slate-400"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 rounded-full border-2 border-slate-300"
                  />
                );

                const content = (
                  <>
                    <span className="flex w-5 shrink-0 justify-center">
                      {icon}
                    </span>

                    <span className="line-clamp-2 min-w-0 flex-1">
                      {lesson.title}
                    </span>
                  </>
                );

                return (
                  <li key={lesson.id}>
                    {locked ? (
                      <div
                        className={rowClass}
                        aria-disabled="true"
                        title={
                          isArabic
                            ? "سجّل بالدورة لفتح هذا الدرس"
                            : "Enroll to unlock this lesson"
                        }
                      >
                        {content}
                      </div>
                    ) : (
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={rowClass}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
