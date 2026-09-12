"use client";

import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import { useLanguage } from "@/components/LanguageProvider";

type Lesson = {
  id: string;
  title: string;
};

type Section = {
  id: string;
  title: string;
  lessons?: Lesson[] | null;
};

type Course = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  is_free: boolean | null;
  price: number | null;
  currency: string | null;
};

type Props = {
  course: Course;
  sections: Section[];
  enrollmentId: string | null;
  completedLessonIds: string[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};


export default function CourseDetailContent({
  course,
  sections,
  enrollmentId,
  completedLessonIds,
  totalLessons,
  completedLessons,
  progressPercent,
}: Props) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-5xl mx-auto w-full space-y-7"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">

        <div className="p-7 md:p-9 text-right flex flex-col">

          {course.category && (
            <span className="self-end inline-flex items-center rounded-full bg-blue-50 text-[#124b8a] px-3 py-1 text-xs font-bold mb-4">
              {course.category}
            </span>
          )}

          <h1 className="text-3xl font-bold text-slate-900">
            {course.title}
          </h1>


          {course.description && (
            <p className="mt-4 text-slate-500 leading-7">
              {course.description}
            </p>
          )}


          <div className="grid grid-cols-2 gap-3 mt-6">

            <div className="rounded-2xl bg-slate-50 p-4 text-right">

              <p className="text-xs text-slate-400">
                {isArabic ? "عدد الدروس" : "Lessons"}
              </p>

              <p className="font-bold text-lg">
                {totalLessons}
              </p>

            </div>



            <div className="rounded-2xl bg-slate-50 p-4 text-right">

              <p className="text-xs text-slate-400">
                {isArabic ? "السعر" : "Price"}
              </p>

              <p className="font-bold text-lg">
                {course.is_free
                  ? isArabic
                    ? "مجانية"
                    : "Free"
                  : `${course.price ?? 0} ${course.currency ?? "JOD"}`}
              </p>

            </div>


          </div>


          {enrollmentId && (

            <div className="mt-5">

              <div className="flex justify-between text-sm mb-2">

                <span className="font-bold text-[#124b8a]">
                  {progressPercent}%
                </span>

                <span>
                  {completedLessons} / {totalLessons}
                </span>

              </div>


              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

                <div
                  className="h-full bg-[#124b8a]"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />

              </div>

            </div>

          )}


          <div className="mt-6 text-right">

            {enrollmentId ? (

              <div className="bg-blue-50 text-[#124b8a] px-5 py-3 rounded-xl font-bold">

                {isArabic
                  ? "أنت مسجل بالدورة"
                  : "You are enrolled"}

              </div>

            ) : course.is_free ? (

              <EnrollButton courseId={course.id}/>

            ) : (

              <BuyCourseButton courseId={course.id}/>

            )}

          </div>


        </div>

      </section>




      <section className="bg-white rounded-[28px] border p-6">


        <div className="flex justify-between mb-6">


          <span className="text-sm text-slate-400">
            {sections.length} {isArabic ? "أقسام" : "Sections"}
          </span>


          <h2 className="text-2xl font-bold">

            {isArabic
              ? "محتوى الدورة"
              : "Course Content"}

          </h2>


        </div>



        {sections.map((section) => (

          <div
            key={section.id}
            className="border rounded-2xl mb-4 overflow-hidden"
          >

            <div className="bg-slate-50 p-4 flex justify-between">


              <span>

                {section.lessons?.length ?? 0}{" "}

                {isArabic ? "درس" : "Lessons"}

              </span>



              <h3 className="font-bold">

                {section.title}

              </h3>


            </div>



            <div className="p-3 space-y-2">


              {section.lessons?.map((lesson) => {


                const completed =
                  completedLessonIds.includes(
                    lesson.id
                  );



                return (

                  <Link
                    key={lesson.id}
                    href={`/courses/${course.id}/lessons/${lesson.id}`}
                    className="flex justify-between bg-slate-50 hover:bg-blue-50 rounded-xl p-3"
                  >


                    <span>

                      {completed
                        ? (isArabic ? "مكتمل" : "Done")
                        : (isArabic ? "غير مكتمل" : "Not done")}

                    </span>



                    <span className="font-medium">

                      {lesson.title}

                    </span>


                  </Link>

                );


              })}


            </div>


          </div>


        ))}


      </section>


    </div>
  );
}
