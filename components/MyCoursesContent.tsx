"use client";

import { useState } from "react";
import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import { useLanguage } from "@/components/LanguageProvider";

type Course = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  nextLessonId?: string | null;
};

type Props = {
  courses: Course[];
  isAuthenticated: boolean;
};

type Filter = "all" | "active" | "done";

export default function MyCoursesContent({
  courses,
  isAuthenticated,
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [filter, setFilter] = useState<Filter>("all");

  const primaryButton =
    "inline-block rounded-xl bg-[#124b8a] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0d3b6e]";

  if (!isAuthenticated) {
    return (
      <div
        className="mx-auto w-full max-w-6xl space-y-6"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <h1 className="text-2xl font-bold text-slate-800">
          {isArabic ? "موادي" : "My Courses"}
        </h1>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-700">
            {isArabic
              ? "سجّل دخولك لعرض دوراتك"
              : "Login to view your courses"}
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            {isArabic
              ? "بعد تسجيل الدخول ستظهر هنا الدورات المسجل بها ونسبة تقدمك."
              : "After login, your enrolled courses and progress will appear here."}
          </p>

          <Link href="/login" className={primaryButton}>
            {isArabic ? "تسجيل الدخول" : "Login"}
          </Link>
        </div>
      </div>
    );
  }

  const doneCount = courses.filter(
    (course) => course.totalLessons > 0 && course.progress >= 100
  ).length;

  const activeCount = courses.length - doneCount;

  const visibleCourses = courses.filter((course) => {
    const isDone = course.totalLessons > 0 && course.progress >= 100;

    if (filter === "done") return isDone;
    if (filter === "active") return !isDone;

    return true;
  });

  const tabs: { id: Filter; label: string; count: number }[] = [
    {
      id: "all",
      label: isArabic ? "الكل" : "All",
      count: courses.length,
    },
    {
      id: "active",
      label: isArabic ? "قيد التعلم" : "In progress",
      count: activeCount,
    },
    {
      id: "done",
      label: isArabic ? "مكتملة" : "Completed",
      count: doneCount,
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#124b8a] via-[#0f3f75] to-[#0b3260] p-6 text-white shadow-lg sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {isArabic ? "دوراتي التعليمية" : "My Courses"}
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-blue-100">
            {isArabic
              ? "أكمل تعلمك من حيث توقفت واستمر في تطوير مهاراتك."
              : "Continue learning from where you stopped and improve your skills."}
          </p>
        </div>
      </section>

      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === tab.id
                  ? "border-[#124b8a] bg-[#124b8a] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}{" "}
              <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      )}

      {visibleCourses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              category={course.category}
              progress={course.progress}
              completedLessons={course.completedLessons}
              totalLessons={course.totalLessons}
              image={course.image}
              nextLessonId={course.nextLessonId}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-700">
            {courses.length === 0
              ? isArabic
                ? "لا توجد دورات مسجلة"
                : "No enrolled courses"
              : isArabic
              ? "لا توجد دورات في هذا التصنيف"
              : "No courses in this filter"}
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            {courses.length === 0
              ? isArabic
                ? "عندما تسجل في دورة ستظهر هنا."
                : "Your enrolled courses will appear here."
              : isArabic
              ? "جرّب اختيار تصنيف آخر."
              : "Try a different filter."}
          </p>

          {courses.length === 0 && (
            <Link href="/courses" className={primaryButton}>
              {isArabic ? "استعرض الدورات" : "Browse Courses"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
