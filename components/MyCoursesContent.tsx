"use client";

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
};

type Props = {
  courses: Course[];
  isAuthenticated: boolean;
};

export default function MyCoursesContent({
  courses,
  isAuthenticated,
}: Props) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  if (!isAuthenticated) {
    return (
      <div
        className="max-w-6xl mx-auto w-full space-y-6"
        dir={isArabic ? "rtl" : "ltr"}
      >

        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          {isArabic ? "موادي" : "My Courses"}
        </h1>


        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">

          <h2 className="text-lg font-bold text-slate-700 mb-2">
            {isArabic
              ? "سجّل دخولك لعرض دوراتك"
              : "Login to view your courses"}
          </h2>


          <p className="text-sm text-slate-500 mb-5">
            {isArabic
              ? "بعد تسجيل الدخول ستظهر هنا الدورات المسجل بها ونسبة تقدمك."
              : "After login, your enrolled courses and progress will appear here."}
          </p>


          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-[#087a54] text-white text-sm font-bold rounded-xl"
          >
            {isArabic ? "تسجيل الدخول" : "Login"}
          </Link>

        </div>

      </div>
    );
  }


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <h1 className="text-3xl font-bold">
          {isArabic
            ? "دوراتي التعليمية"
            : "My Courses"}
        </h1>


        <p className="mt-3 text-blue-100">
          {isArabic
            ? "أكمل تعلمك من حيث توقفت واستمر في تطوير مهاراتك."
            : "Continue learning from where you stopped and improve your skills."}
        </p>

      </section>



      {courses.length > 0 ? (

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

          {courses.map((course) => (

            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              category={course.category}
              progress={course.progress}
              completedLessons={course.completedLessons}
              totalLessons={course.totalLessons}
              image={course.image}
            />

          ))}

        </div>

      ) : (

        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">

          <h2 className="text-lg font-bold text-slate-700 mb-2">
            {isArabic
              ? "لا توجد دورات مسجلة"
              : "No enrolled courses"}
          </h2>


          <p className="text-sm text-slate-500 mb-5">
            {isArabic
              ? "عندما تسجل في دورة ستظهر هنا."
              : "Your enrolled courses will appear here."}
          </p>


          <Link
            href="/courses"
            className="inline-block px-5 py-2.5 bg-[#087a54] text-white text-sm font-bold rounded-xl"
          >
            {isArabic
              ? "استعرض الدورات"
              : "Browse Courses"}
          </Link>

        </div>

      )}

    </div>
  );
}
