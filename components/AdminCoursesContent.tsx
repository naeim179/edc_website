"use client";

import Link from "next/link";
import AdminCourseCard from "@/components/admin/AdminCourseCard";
import { useLanguage } from "@/components/LanguageProvider";

type Course = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean | null;
  course_type: "group" | "private" | null;
  is_published: boolean | null;
  created_at: string;
  sections: {
    id: string;
    lessons: {
      id: string;
    }[];
  }[] | null;

  enrollments: {
    id: string;
  }[] | null;

  course_instructors: {
    teacher_id: string;
    teacher: {
      full_name: string | null;
    }[] | null;
  }[] | null;
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
      className="max-w-7xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <div className="flex items-center justify-between gap-4">

          <Link
            href="/admin/courses/new"
            className="bg-white text-[#124b8a] px-5 py-3 rounded-xl font-bold"
          >
            + {t.admin.addCourseButton}
          </Link>


          <div>
            <h1 className="text-3xl font-bold">
              {t.admin.manageCourses}
            </h1>

            <p className="mt-2 text-blue-100">
              {t.admin.manageCoursesText}
            </p>
          </div>

        </div>

      </section>


      {courses.length ? (

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {courses.map((course) => (
            <AdminCourseCard
              key={course.id}
              course={course}
            />
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
