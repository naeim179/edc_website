"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CheckCircleIcon,
  LockIcon,
  PlayIcon,
} from "@/components/icons";
import { formatLessons } from "@/lib/course-format";

import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
import ProgressBar from "@/components/ui/ProgressBar";

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
      className="yw-curriculum h-fit xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto"
    >
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold text-[var(--brand-text)]">
            {isArabic ? "محتوى الدورة" : "Course content"}
          </h2>

          {isEnrolled && (
            <div className="mt-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--brand-text-muted)]">
                  {isArabic ? "تقدمك" : "Your progress"}
                </span>

                <span className="font-bold text-[var(--brand-ink)]">
                  {progress}%
                </span>
              </div>

              <ProgressBar value={progress} />

              <p className="mt-3 text-xs text-[var(--brand-text-faint)]">
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
                  <h3 className="text-sm font-bold text-[var(--brand-text)]">
                    {section.title}
                  </h3>

                  <span className="shrink-0 text-xs text-[var(--brand-text-faint)]">
                    {formatLessons(section.lessons.length, isArabic)}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {section.lessons.map((lesson) => {
                    const isDone = completed.has(lesson.id);
                    const isCurrent = currentLessonId === lesson.id;
                    const locked =
                      !isEnrolled && !lesson.isFreePreview;

                    const rowClass = `flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
                      isCurrent
                        ? "border border-[var(--brand-ink)]/20 bg-[var(--brand-bg)] font-bold text-[var(--brand-ink)]"
                        : locked
                        ? "bg-[var(--brand-bg)]/60 text-[var(--brand-text-faint)]"
                        : "bg-[var(--brand-bg)]/60 text-[var(--brand-text-muted)] hover:bg-[var(--brand-border-soft)]"
                    }`;

                    const icon = isDone ? (
                      <CheckCircleIcon
                        width={20}
                        height={20}
                        className="text-emerald-600"
                      />
                    ) : isCurrent ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-ink)] text-[var(--brand-on-ink)]">
                        <PlayIcon width={9} height={9} />
                      </span>
                    ) : locked ? (
                      <LockIcon
                        width={18}
                        height={18}
                        className="text-[var(--brand-text-faint)]"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 rounded-full border-2 border-[var(--brand-border)]"
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
        </CardContent>
      </Card>
    </aside>
  );
}
