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

type Teacher = {
  id: string;
  full_name: string | null;
  teacher_profiles?: {
    image_url: string | null;
    bio: string | null;
    specialization: string | null;
    experience_years: number | null;
  }[];
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

  discount_type:
    | "percentage"
    | "fixed"
    | null;

  discount_value: number | null;

  course_type: "group" | "private";

  course_instructors?: {
    teacher?: Teacher[];
  }[];
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

  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";


  const originalPrice =
    course.price ?? 0;

  const discountValue =
    course.discount_value ?? 0;


  let finalPrice =
    originalPrice;


  if (
    course.discount_type ===
    "percentage"
  ) {

    finalPrice =
      originalPrice -
      originalPrice *
        (discountValue / 100);

  }


  if (
    course.discount_type ===
    "fixed"
  ) {

    finalPrice =
      originalPrice -
      discountValue;

  }


  finalPrice =
    Math.max(0, finalPrice);


  const hasDiscount =
    !course.is_free &&
    originalPrice > 0 &&
    discountValue > 0 &&
    finalPrice < originalPrice;


  const teacher =
    course.course_instructors?.[0]
      ?.teacher?.[0] ?? null;


  const teacherProfile =
    teacher?.teacher_profiles?.[0] ??
    null;


  return (
    <div
      className="max-w-5xl mx-auto w-full space-y-7"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">

        {course.image_url && (
          <div
            className="h-64 md:h-80 bg-cover bg-center"
            style={{
              backgroundImage:
                `url("${course.image_url}")`,
            }}
          />
        )}


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
                {isArabic
                  ? "عدد الدروس"
                  : "Lessons"}
              </p>

              <p className="font-bold text-lg">
                {totalLessons}
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-4 text-right">

              <p className="text-xs text-slate-400">
                {isArabic
                  ? "السعر"
                  : "Price"}
              </p>


              {enrollmentId ? (

                <p className="font-bold text-lg text-[#124b8a]">
                  {isArabic
                    ? "مسجل"
                    : "Enrolled"}
                </p>

              ) : course.is_free ? (

                <p className="font-bold text-lg text-emerald-600">
                  {isArabic
                    ? "مجانية"
                    : "Free"}
                </p>

              ) : hasDiscount ? (

                <div>

                  <p className="text-sm text-slate-400 line-through">
                    {originalPrice.toFixed(2)}{" "}
                    {course.currency ?? "JOD"}
                  </p>

                  <p className="font-bold text-lg text-emerald-600">
                    {finalPrice.toFixed(2)}{" "}
                    {course.currency ?? "JOD"}
                  </p>

                  <span className="inline-block mt-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                    {course.discount_type ===
                    "percentage"
                      ? `خصم ${discountValue}%`
                      : `خصم ${discountValue} ${course.currency ?? "JOD"}`}
                  </span>

                </div>

              ) : (

                <p className="font-bold text-lg">
                  {finalPrice.toFixed(2)}{" "}
                  {course.currency ?? "JOD"}
                </p>

              )}

            </div>

          </div>


          {enrollmentId && (

            <div className="mt-5">

              <div className="flex justify-between text-sm mb-2">

                <span className="font-bold text-[#124b8a]">
                  {progressPercent}%
                </span>

                <span>
                  {completedLessons} /{" "}
                  {totalLessons}
                </span>

              </div>


              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

                <div
                  className="h-full bg-[#124b8a]"
                  style={{
                    width:
                      `${progressPercent}%`,
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

              <EnrollButton
                courseId={course.id}
              />

            ) : (

              <BuyCourseButton
                courseId={course.id}
              />

            )}

          </div>

        </div>

      </section>


      {teacher && (
        <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">

          <h2 className="text-2xl font-bold mb-6">
            {isArabic
              ? "مدرب الدورة"
              : "Course Instructor"}
          </h2>


          <div className="flex flex-col md:flex-row gap-6 items-start">

            <div className="w-28 h-28 rounded-full bg-blue-50 overflow-hidden shrink-0">

              {teacherProfile?.image_url ? (

                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      `url("${teacherProfile.image_url}")`,
                  }}
                />

              ) : (

                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#124b8a]">
                  {(teacher.full_name ??
                    "T")
                    .charAt(0)
                    .toUpperCase()}
                </div>

              )}

            </div>


            <div className="flex-1 text-right">

              <h3 className="text-xl font-bold text-slate-800">
                {teacher.full_name ??
                  (isArabic
                    ? "مدرب الدورة"
                    : "Course Instructor")}
              </h3>


              {teacherProfile?.specialization && (
                <p className="mt-2 text-[#124b8a] font-bold">
                  {teacherProfile.specialization}
                </p>
              )}


              {teacherProfile?.experience_years !==
                null &&
                teacherProfile?.experience_years !==
                  undefined && (

                  <p className="mt-2 text-sm text-slate-500">
                    {isArabic
                      ? `${teacherProfile.experience_years} سنوات خبرة`
                      : `${teacherProfile.experience_years} years of experience`}
                  </p>

                )}


              {teacherProfile?.bio && (
                <p className="mt-4 text-slate-500 leading-7">
                  {teacherProfile.bio}
                </p>
              )}

            </div>

          </div>

        </section>
      )}


      <section className="bg-white rounded-[28px] border p-6">

        <div className="flex justify-between mb-6">

          <span className="text-sm text-slate-400">
            {sections.length}{" "}
            {isArabic
              ? "أقسام"
              : "Sections"}
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
                {isArabic
                  ? "درس"
                  : "Lessons"}
              </span>


              <h3 className="font-bold">
                {section.title}
              </h3>

            </div>


            <div className="p-3 space-y-2">

              {section.lessons?.map(
                (lesson) => {

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
                          ? isArabic
                            ? "مكتمل"
                            : "Done"
                          : isArabic
                            ? "غير مكتمل"
                            : "Not done"}
                      </span>


                      <span className="font-medium">
                        {lesson.title}
                      </span>

                    </Link>
                  );

                }
              )}

            </div>

          </div>

        ))}

      </section>

    </div>
  );
}
