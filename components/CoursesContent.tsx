"use client";

import CourseCatalogCard from "@/components/CourseCatalogCard";
import { useLanguage } from "@/components/LanguageProvider";

type Course = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;
  lessons: number;
  progress: number;
};

type Props = {
  courses: Course[];
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


  return (
    <div
      className="max-w-6xl mx-auto w-full"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="mb-6">

        <h1 className="text-2xl font-bold text-slate-800">
          {isArabic
            ? "جميع الدورات"
            : "All Courses"}
        </h1>


        {searchQuery && (
          <p className="text-sm text-slate-500 mt-2">
            {isArabic
              ? `نتائج البحث عن: ${searchText}`
              : `Search results for: ${searchText}`}
          </p>
        )}

      </div>



      {courses.length > 0 ? (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {courses.map((course) => (

            <CourseCatalogCard
              key={course.id}
              id={course.id}
              title={course.title}
              category={course.category}
              lessons={course.lessons}
              progress={course.progress}
              image={course.image}
            />

          ))}

        </div>

      ) : (

        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">

          <h2 className="text-lg font-bold text-slate-700 mb-2">
            {isArabic
              ? "لا توجد دورات"
              : "No courses"}
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
