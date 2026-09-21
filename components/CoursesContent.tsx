"use client";

import { useMemo, useState } from "react";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { CatalogCourse } from "@/lib/course-catalog";

type Props = {
  courses: CatalogCourse[];
  searchQuery: string;
  searchText?: string;
};

export default function CoursesContent({
  courses,
  searchQuery,
  searchText,
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((course) => course.category)
            .filter((value): value is string => Boolean(value))
        )
      ),
    [courses]
  );

  const visibleCourses = category
    ? courses.filter((course) => course.category === category)
    : courses;

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? "border-[#124b8a] bg-[#124b8a] text-white"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          {isArabic ? "جميع الدورات" : "All Courses"}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {searchQuery
            ? isArabic
              ? `نتائج البحث عن: ${searchText}`
              : `Search results for: ${searchText}`
            : isArabic
            ? `${visibleCourses.length} دورة متاحة`
            : `${visibleCourses.length} courses available`}
        </p>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={chip(category === null)}
          >
            {isArabic ? "الكل" : "All"}
          </button>

          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={chip(category === item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {visibleCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCatalogCard
              key={course.id}
              id={course.id}
              title={course.title}
              category={course.category}
              instructor={course.instructor}
              lessons={course.lessons}
              progress={course.progress}
              image={course.image}
              enrolled={course.enrolled}
              price={course.price}
              currency={course.currency}
              isFree={course.isFree}
              discountType={course.discountType}
              discountValue={course.discountValue}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-700">
            {isArabic ? "لا توجد دورات" : "No courses"}
          </h2>

          <p className="text-sm text-slate-500">
            {searchQuery
              ? isArabic
                ? "لم نجد دورات مطابقة لعملية البحث."
                : "No courses matched your search."
              : isArabic
              ? "لا توجد دورات منشورة حاليًا."
              : "No published courses available."}
          </p>
        </div>
      )}
    </div>
  );
}
