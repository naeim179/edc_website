"use client";

import Link from "next/link";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";
import { useLanguage } from "@/components/LanguageProvider";

type Course = {
  id: string;
  title: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean | null;
  course_type: "group" | "private" | null;
  is_published: boolean | null;
};

type Props = {
  courses: Course[];
};

export default function AdminCoursesContent({
  courses,
}: Props) {

  const { language, t } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <div className="flex items-center justify-between">

          <Link
            href="/admin/courses/new"
            className="bg-white text-[#124b8a] px-5 py-3 rounded-xl font-bold"
          >
            + {t.admin.addCourseButton}
          </Link>


          <div className="text-right">

            <h1 className="text-3xl font-bold">
              {t.admin.manageCourses}
            </h1>


            <p className="mt-2 text-blue-100">
              {t.admin.manageCoursesText}
            </p>

          </div>

        </div>

      </section>


      {courses.length > 0 ? (

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

          {courses.map((course) => (

            <div
              key={course.id}
              className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 space-y-4"
            >

              <div className="text-right">

                <h2 className="text-lg font-bold text-slate-800">
                  {course.title}
                </h2>


                <p className="text-sm text-slate-500 mt-2">
                  {course.category ??
                    t.admin.noCategory}
                </p>

              </div>


              <div className="flex justify-end gap-2 flex-wrap">

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    course.is_published
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {course.is_published
                    ? t.admin.published
                    : t.admin.draft}
                </span>


                <div className="flex flex-col gap-2 items-end">

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                    {course.course_type === "group"
                      ? "Group"
                      : "Private"}
                  </span>


                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                    {course.is_free
                      ? "Free"
                      : `${course.price ?? 0} ${
                          course.currency ?? "USD"
                        }`}
                  </span>

                </div>

              </div>


              <div className="grid grid-cols-2 gap-2 pt-3">

                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  className="text-center bg-slate-100 hover:bg-slate-200 rounded-xl py-2 text-sm font-bold"
                >
                  {t.admin.edit}
                </Link>


                <Link
                  href={`/admin/courses/${course.id}/sections`}
                  className="text-center bg-emerald-50 hover:bg-emerald-100 text-[#087a54] rounded-xl py-2 text-sm font-bold"
                >
                  {t.admin.content}
                </Link>

              </div>


              <div className="flex justify-end pt-2">

                <DeleteCourseButton id={course.id} />

              </div>


            </div>

          ))}

        </div>

      ) : (

        <div className="bg-white rounded-2xl p-10 text-center border">
          {t.admin.noCoursesAvailable}
        </div>

      )}

    </div>
  );
}
