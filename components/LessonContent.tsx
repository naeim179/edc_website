"use client";

import Link from "next/link";
import CompleteLessonButton from "@/components/CompleteLessonButton";
import LessonVideoPlayer from "@/components/lessons/LessonVideoPlayer";
import CourseLessonSidebar from "@/components/CourseLessonSidebar";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ArrowIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  PlayIcon,
} from "@/components/icons";

type SidebarSection = {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    isFreePreview: boolean;
  }[];
};

type Props = {
  courseId: string;
  courseTitle: string;
  lesson: {
    id: string;
    title: string;
    duration: string | null;
    sectionTitle: string | null;
    isFreePreview: boolean;
    video_provider: string | null;
    youtube_video_id: string | null;
    mux_playback_id: string | null;
    bunny_library_id: string | null;
    bunny_video_id: string | null;
    lesson_type: string | null;
    live_platform: string | null;
    live_schedule: string | null;
    content_url: string | null;
  };
  enrollmentId: string | null;
  completed: boolean;
  sections: SidebarSection[];
  completedLessonIds: string[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  position: { current: number; total: number };
};

export default function LessonContent({
  courseId,
  courseTitle,
  lesson,
  enrollmentId,
  completed,
  sections,
  completedLessonIds,
  previousLessonId,
  nextLessonId,
  position,
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const isEnrolled = Boolean(enrollmentId);

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-5"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <nav
        aria-label={isArabic ? "مسار التنقل" : "Breadcrumb"}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500"
      >
        <Link
          href={`/courses/${courseId}`}
          className="font-bold text-[#124b8a] hover:underline"
        >
          {courseTitle ||
            (isArabic ? "العودة إلى الدورة" : "Back to course")}
        </Link>

        {lesson.sectionTitle && (
          <>
            <span aria-hidden="true">/</span>
            <span>{lesson.sectionTitle}</span>
          </>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {lesson.lesson_type === "live" ? (
              <div className="m-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <h2 className="text-xl font-bold text-[#124b8a]">
                  {isArabic ? "درس مباشر" : "Live Lesson"}
                </h2>

                <div className="mt-4 space-y-2 text-slate-700">
                  <p>
                    <strong>
                      {isArabic ? "المنصة:" : "Platform:"}
                    </strong>{" "}
                    {lesson.live_platform ?? "-"}
                  </p>

                  <p>
                    <strong>
                      {isArabic ? "الموعد:" : "Schedule:"}
                    </strong>{" "}
                    {lesson.live_schedule ?? "-"}
                  </p>
                </div>

                {lesson.content_url && (
                  <a
                    href={lesson.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#124b8a] px-5 py-3 font-bold text-white hover:bg-[#0d3b6e]"
                  >
                    {isArabic ? "دخول الجلسة" : "Join Session"}
                    <ExternalLinkIcon width={16} height={16} />
                  </a>
                )}
              </div>
            ) : (
              <LessonVideoPlayer
                provider={lesson.video_provider}
                youtubeVideoId={lesson.youtube_video_id}
                muxPlaybackId={lesson.mux_playback_id}
                bunnyLibraryId={lesson.bunny_library_id}
                bunnyVideoId={lesson.bunny_video_id}
                title={lesson.title}
              />
            )}

            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#124b8a]">
                  {isArabic
                    ? `الدرس ${position.current} من ${position.total}`
                    : `Lesson ${position.current} of ${position.total}`}
                </span>

                {lesson.duration && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    <ClockIcon width={13} height={13} />
                    {lesson.duration}
                  </span>
                )}

                {!isEnrolled && lesson.isFreePreview && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {isArabic ? "معاينة مجانية" : "Free preview"}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold leading-9 text-slate-900 sm:text-3xl">
                {lesson.title}
              </h1>

              {isEnrolled && enrollmentId ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
                      completed
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {completed && (
                      <CheckCircleIcon width={16} height={16} />
                    )}

                    {completed
                      ? isArabic
                        ? "تم إكمال الدرس"
                        : "Lesson completed"
                      : isArabic
                      ? "الدرس غير مكتمل"
                      : "Lesson not completed"}
                  </span>

                  <CompleteLessonButton
                    enrollmentId={enrollmentId}
                    lessonId={lesson.id}
                    initialCompleted={completed}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-7 text-slate-600">
                    {isArabic
                      ? "هذا درس مجاني للمعاينة. سجّل بالدورة لتفتح باقي الدروس وتتابع تقدمك."
                      : "This is a free preview lesson. Enroll in the course to unlock the rest and track your progress."}
                  </p>

                  <Link
                    href={`/courses/${courseId}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#124b8a] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d3b6e]"
                  >
                    <PlayIcon width={13} height={13} />
                    {isArabic ? "عرض الدورة" : "View course"}
                  </Link>
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            {previousLessonId ? (
              <Link
                href={`/courses/${courseId}/lessons/${previousLessonId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <ArrowIcon
                  width={16}
                  height={16}
                  className="rotate-180 rtl:rotate-0"
                />
                {isArabic ? "الدرس السابق" : "Previous lesson"}
              </Link>
            ) : (
              <span />
            )}

            {nextLessonId && (
              <Link
                href={`/courses/${courseId}/lessons/${nextLessonId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#124b8a] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0d3b6e]"
              >
                {isArabic ? "الدرس التالي" : "Next lesson"}
                <ArrowIcon
                  width={16}
                  height={16}
                  className="rtl:rotate-180"
                />
              </Link>
            )}
          </div>
        </div>

        <CourseLessonSidebar
          courseId={courseId}
          sections={sections}
          currentLessonId={lesson.id}
          completedLessonIds={completedLessonIds}
          isEnrolled={isEnrolled}
        />
      </div>
    </div>
  );
}
