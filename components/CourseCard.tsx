"use client";

import Link from "next/link";
import CourseCover from "@/components/CourseCover";
import { useLanguage } from "@/components/LanguageProvider";
import { ArrowIcon, CheckCircleIcon } from "@/components/icons";

type CourseCardProps = {
  id: string;
  title: string;
  category?: string | null;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  image?: string | null;
  nextLessonId?: string | null;
  /** false = الطالب مش مسجل بالدورة (يظهر زر "عرض الدورة") */
  enrolled?: boolean;
};

export default function CourseCard({
  id,
  title,
  category,
  progress,
  completedLessons,
  totalLessons,
  image,
  nextLessonId,
  enrolled = true,
}: CourseCardProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const done = enrolled && progress >= 100;

  const href =
    enrolled && nextLessonId && !done
      ? `/courses/${id}/lessons/${nextLessonId}`
      : `/courses/${id}`;

  const label = !enrolled
    ? isArabic
      ? "عرض الدورة"
      : "View course"
    : done
    ? isArabic
      ? "مراجعة الدورة"
      : "Review course"
    : progress > 0
    ? isArabic
      ? "متابعة التعلم"
      : "Continue learning"
    : isArabic
    ? "ابدأ الدورة"
    : "Start course";

  return (
    <article
      dir={isArabic ? "rtl" : "ltr"}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none"
    >
      <Link
        href={`/courses/${id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[16/9] overflow-hidden"
      >
        <CourseCover image={image} title={title} />

        {category && (
          <span className="absolute start-3 top-3 rounded-full bg-[#ffffff]/90 px-3 py-1 text-xs font-bold text-[#124b8a] backdrop-blur">
            {category}
          </span>
        )}

        {done && (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
            <CheckCircleIcon width={14} height={14} />
            {isArabic ? "مكتملة" : "Completed"}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-7 text-slate-800">
          <Link
            href={`/courses/${id}`}
            className="transition-colors hover:text-[#124b8a]"
          >
            {title}
          </Link>
        </h3>

        {enrolled && (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {isArabic
                  ? `${completedLessons} من ${totalLessons} درس مكتمل`
                  : `${completedLessons} of ${totalLessons} lessons completed`}
              </span>

              <span
                className={`font-bold ${
                  done ? "text-emerald-600" : "text-[#124b8a]"
                }`}
              >
                {progress}%
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  done ? "bg-emerald-500" : "bg-[#124b8a]"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Link
          href={href}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#124b8a] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d3b6e]"
        >
          {label}
          <ArrowIcon
            width={16}
            height={16}
            className="rtl:rotate-180"
          />
        </Link>
      </div>
    </article>
  );
}
