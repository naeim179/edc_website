"use client";

import Link from "next/link";
import CompleteLessonButton from "@/components/CompleteLessonButton";
import LessonVideoPlayer from "@/components/lessons/LessonVideoPlayer";
import CourseLessonSidebar from "@/components/CourseLessonSidebar";
import { useLanguage } from "@/components/LanguageProvider";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
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
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#A69C8C]"
      >
        <Link
          href={`/courses/${courseId}`}
          className="font-bold text-[#1B4B43] hover:underline"
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
          <Card className="overflow-hidden">
            {lesson.lesson_type === "live" ? (
              <div className="m-6 rounded-2xl border border-[#E8E1D4] bg-[#F7F3EC] p-6">
                <h2 className="text-xl font-bold text-[#1B4B43]">
                  {isArabic ? "درس مباشر" : "Live Lesson"}
                </h2>

                <div className="mt-4 space-y-2 text-[#6B6155]">
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
                  <Button
                    href={lesson.content_url}
                    className="mt-5"
                  >
                    {isArabic ? "دخول الجلسة" : "Join Session"}
                    <ExternalLinkIcon width={16} height={16} />
                  </Button>
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

            <CardContent className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">
                  {isArabic
                    ? `الدرس ${position.current} من ${position.total}`
                    : `Lesson ${position.current} of ${position.total}`}
                </Badge>

                {lesson.duration && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E1D4] bg-[#F7F3EC] px-3 py-1 text-xs font-semibold text-[#6B6155]">
                    <ClockIcon width={13} height={13} />
                    {lesson.duration}
                  </span>
                )}

                {!isEnrolled && lesson.isFreePreview && (
                  <Badge variant="warning">
                    {isArabic ? "معاينة مجانية" : "Free preview"}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold leading-9 text-[#2A2420] sm:text-3xl">
                {lesson.title}
              </h1>

              {isEnrolled && enrollmentId ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-[#F0EBE1] pt-5">
                  <Badge variant={completed ? "success" : "default"}>
                    <span className="flex items-center gap-1.5">
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
                  </Badge>

                  <CompleteLessonButton
                    enrollmentId={enrollmentId}
                    lessonId={lesson.id}
                    initialCompleted={completed}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl bg-[#F7F3EC] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-7 text-[#6B6155]">
                    {isArabic
                      ? "هذا درس مجاني للمعاينة. سجّل بالدورة لتفتح باقي الدروس وتتابع تقدمك."
                      : "This is a free preview lesson. Enroll in the course to unlock the rest and track your progress."}
                  </p>

                  <Button
                    href={`/courses/${courseId}`}
                    className="shrink-0"
                  >
                    <PlayIcon width={13} height={13} />
                    {isArabic ? "عرض الدورة" : "View course"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            {previousLessonId ? (
              <Button
                href={`/courses/${courseId}/lessons/${previousLessonId}`}
                variant="secondary"
              >
                <ArrowIcon
                  width={16}
                  height={16}
                  className="rotate-180 rtl:rotate-0"
                />
                {isArabic ? "الدرس السابق" : "Previous lesson"}
              </Button>
            ) : (
              <span />
            )}

            {nextLessonId && (
              <Button
                href={`/courses/${courseId}/lessons/${nextLessonId}`}
              >
                {isArabic ? "الدرس التالي" : "Next lesson"}
                <ArrowIcon
                  width={16}
                  height={16}
                  className="rtl:rotate-180"
                />
              </Button>
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
