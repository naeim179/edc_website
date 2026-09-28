"use client";

import { useState } from "react";
import Link from "next/link";

import CourseCard from "@/components/CourseCard";
import { useLanguage } from "@/components/LanguageProvider";

import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
import Button from "@/components/ui/Button";

type Course = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;

  totalLessons: number;
  completedLessons: number;
  progress: number;

  nextLessonId?: string | null;

  isFree: boolean;
  accessActive: boolean;

  expiresAt: string | null;
  daysRemaining: number | null;
  autoRenew: boolean;
};

type Props = {
  courses: Course[];
  isAuthenticated: boolean;
};

type Filter =
  | "all"
  | "active"
  | "done"
  | "expired";

export default function MyCoursesContent({
  courses,
  isAuthenticated,
}: Props) {
  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    filter,
    setFilter,
  ] = useState<Filter>("all");

  const primaryButton =
    "inline-block rounded-xl bg-[#1B4B43] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#123A34]";

  if (!isAuthenticated) {
    return (
      <div
        className="mx-auto w-full max-w-6xl space-y-6"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <h1 className="text-2xl font-bold text-[#2A2420]">
          {isArabic
            ? "موادي"
            : "My Courses"}
        </h1>

        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-[#2A2420]">
              {isArabic
                ? "سجّل دخولك لعرض دوراتك"
                : "Login to view your courses"}
            </h2>

            <Link
              href="/login"
              className={
                primaryButton
              }
            >
              {isArabic
                ? "تسجيل الدخول"
                : "Login"}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiredCount =
    courses.filter(
      (course) =>
        !course.accessActive
    ).length;

  const doneCount =
    courses.filter(
      (course) =>
        course.accessActive &&
        course.totalLessons > 0 &&
        course.progress >= 100
    ).length;

  const activeCount =
    courses.filter(
      (course) =>
        course.accessActive &&
        !(
          course.totalLessons >
            0 &&
          course.progress >= 100
        )
    ).length;

  const visibleCourses =
    courses.filter(
      (course) => {
        const done =
          course.accessActive &&
          course.totalLessons >
            0 &&
          course.progress >= 100;

        if (
          filter ===
          "expired"
        ) {
          return !course.accessActive;
        }

        if (
          filter ===
          "done"
        ) {
          return done;
        }

        if (
          filter ===
          "active"
        ) {
          return (
            course.accessActive &&
            !done
          );
        }

        return true;
      }
    );

  const tabs: {
    id: Filter;
    label: string;
    count: number;
  }[] = [
    {
      id: "all",
      label: isArabic
        ? "الكل"
        : "All",
      count: courses.length,
    },
    {
      id: "active",
      label: isArabic
        ? "قيد التعلم"
        : "In progress",
      count: activeCount,
    },
    {
      id: "done",
      label: isArabic
        ? "مكتملة"
        : "Completed",
      count: doneCount,
    },
    {
      id: "expired",
      label: isArabic
        ? "منتهية"
        : "Expired",
      count: expiredCount,
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1B4B43] to-[#0F332D] p-6 text-white shadow-lg sm:p-8">
        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {isArabic
              ? "دوراتي التعليمية"
              : "My Courses"}
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-white/75">
            {isArabic
              ? "تابع تقدمك، مدة اشتراكك وتجديد دوراتك من مكان واحد."
              : "Track your progress, subscription period, and renewals in one place."}
          </p>
        </div>
      </section>

      {courses.length >
        0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map(
            (tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setFilter(
                    tab.id
                  )
                }
                aria-pressed={
                  filter ===
                  tab.id
                }
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  filter ===
                  tab.id
                    ? "border-[#1B4B43] bg-[#1B4B43] text-white"
                    : "border-[#E8E1D4] bg-white text-[#6B6258] hover:bg-[#F5F1EA]"
                }`}
              >
                {tab.label}{" "}
                <span className="opacity-70">
                  ({tab.count})
                </span>
              </button>
            )
          )}
        </div>
      )}

      {visibleCourses.length >
      0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map(
            (course) => (
              <CourseCard
                key={
                  course.id
                }
                id={
                  course.id
                }
                title={
                  course.title
                }
                category={
                  course.category
                }
                progress={
                  course.progress
                }
                completedLessons={
                  course.completedLessons
                }
                totalLessons={
                  course.totalLessons
                }
                image={
                  course.image
                }
                nextLessonId={
                  course.nextLessonId
                }
                isFree={
                  course.isFree
                }
                accessActive={
                  course.accessActive
                }
                expiresAt={
                  course.expiresAt
                }
                daysRemaining={
                  course.daysRemaining
                }
                autoRenew={
                  course.autoRenew
                }
              />
            )
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-[#2A2420]">
              {courses.length ===
              0
                ? isArabic
                  ? "لا توجد دورات مسجلة"
                  : "No enrolled courses"
                : isArabic
                ? "لا توجد دورات في هذا التصنيف"
                : "No courses in this filter"}
            </h2>

            {courses.length ===
              0 && (
              <Link
                href="/courses"
                className={
                  primaryButton
                }
              >
                {isArabic
                  ? "استعرض الدورات"
                  : "Browse Courses"}
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
