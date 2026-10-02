"use client";

import { useMemo, useState } from "react";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import { useLanguage } from "@/components/LanguageProvider";

import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
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
  const { language, t } = useLanguage();
  const isArabic = language === "ar";

  const [category, setCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [sort, setSort] = useState<"default" | "lessons">("default");

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

  const visibleCourses = useMemo(() => {

    let result = [...courses];

    if (category) {
      result = result.filter(
        (course) => course.category === category
      );
    }

    if (priceFilter === "free") {
      result = result.filter(
        (course) => course.isFree
      );
    }

    if (priceFilter === "paid") {
      result = result.filter(
        (course) => !course.isFree
      );
    }

    if (sort === "lessons") {
      result.sort(
        (a,b) => b.lessons - a.lessons
      );
    }

    return result;

  }, [courses, category, priceFilter, sort]);

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? "border-[#1B4B43] bg-[#1B4B43] text-white"
        : "border-[#E8E1D4] bg-white text-[#6B6258] hover:bg-[#F5F1EA]"
    }`;

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className="
        rounded-3xl
        bg-gradient-to-l
        from-[#1B4B43]
        to-[#0F332D]
        p-8
        text-white
        shadow-sm
      ">

        <h1 className="text-3xl font-bold">
          {t.courses.allCourses}
        </h1>

        <p className="mt-2 text-blue-100">
          {searchQuery
            ? isArabic
              ? `نتائج البحث عن: ${searchText}`
              : `Search results for: ${searchText}`
            : isArabic
              ? "اكتشف الدورات التعليمية وابدأ التعلم"
              : "Discover courses and start learning"}
        </p>


        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-2xl font-bold">
              {visibleCourses.length}
            </div>
            <div className="text-sm text-blue-100">
              {isArabic ? "دورة" : "Courses"}
            </div>
          </div>


          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-2xl font-bold">
              {categories.length}
            </div>
            <div className="text-sm text-blue-100">
              {isArabic ? "تصنيفات" : "Categories"}
            </div>
          </div>


          <div className="hidden rounded-2xl bg-white/10 p-4 sm:block">
            <div className="text-2xl font-bold">
              ✓
            </div>
            <div className="text-sm text-blue-100">
              {isArabic ? "تعلم معنا" : "Learn with us"}
            </div>
          </div>

        </div>

      </section>

      <div className="flex flex-wrap gap-3">

        <button
          type="button"
          onClick={() => setCategory(null)}
          className={chip(category === null)}
        >
          {t.courses.all}
        </button>


        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={chip(category === item)}
          >
            {item}
          </button>
        ))}


        <button
          type="button"
          onClick={() => setPriceFilter("free")}
          className={chip(priceFilter === "free")}
        >
          {isArabic ? "مجاني" : "Free"}
        </button>


        <button
          type="button"
          onClick={() => setPriceFilter("paid")}
          className={chip(priceFilter === "paid")}
        >
          {isArabic ? "مدفوع" : "Paid"}
        </button>


        <button
          type="button"
          onClick={() => setPriceFilter("all")}
          className={chip(priceFilter === "all")}
        >
          {isArabic ? "كل الأسعار" : "All Prices"}
        </button>


        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "default" | "lessons")
          }
          className="rounded-full border px-4 py-2 text-sm"
        >
          <option value="default">
            {isArabic ? "الافتراضي" : "Default"}
          </option>

          <option value="lessons">
            {isArabic ? "الأكثر دروساً" : "Most Lessons"}
          </option>

        </select>

      </div>

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
                deliveryType={course.deliveryType}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-[#2A2420]">
              {t.courses.noCourses}
            </h2>

            <p className="text-sm text-[#6B6258]">
              {searchQuery
                ? isArabic
                  ? "لم نجد دورات مطابقة لعملية البحث."
                  : "No courses matched your search."
                : isArabic
                ? "لا توجد دورات منشورة حاليًا."
                : "No published courses available."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
