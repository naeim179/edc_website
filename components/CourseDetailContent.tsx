"use client";

import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import { useLanguage } from "@/components/LanguageProvider";
import { useState } from "react";

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

  course_offers?: {
    id: string;
    type: string;
    price: number;
    discount_type: string | null;
    final_price: number | null;
    discount_value: number | null;

    course_instructors?: {
      teacher?: {
        id: string;
        full_name: string | null;
        teacher_profiles?: {
          image_url: string | null;
          bio: string | null;
          specialization: string | null;
          experience_years: number | null;
        }[];
      }[];
    }[];

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

  const { language } = useLanguage();

  const [selectedOfferId, setSelectedOfferId] =
    useState<string | null>(null);


  const isArabic = language === "ar";


  const offers =
    course.course_offers ?? [];


  const activeOffer =
    offers.find(
      (offer) =>
        offer.id === selectedOfferId
    ) ?? offers[0];


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


          {offers.length > 0 && (

            <div className="mt-6 space-y-4">

              {offers.map((offer)=>(

                <div
                  key={offer.id}
                  onClick={() =>
                    setSelectedOfferId(offer.id)
                  }
                  className={`cursor-pointer rounded-2xl p-5 space-y-4 border-2 transition ${
                    activeOffer?.id === offer.id
                      ? "border-[#124b8a] bg-blue-50"
                      : "bg-slate-50 border-transparent"
                  }`}
                >

                  <div className="flex justify-between items-center">

                    <h3 className="font-bold text-lg">
                      {offer.type === "group"
                        ? "Group Course"
                        : "Private Course"}
                    </h3>


                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                      {offer.type}
                    </span>

                  </div>



                  {offer.course_instructors?.map((item)=>{

                    const teacher =
                      item.teacher?.[0];


                    const profile =
                      teacher?.teacher_profiles?.[0];


                    if(!teacher) return null;


                    return (

                      <div
                        key={teacher.id}
                        className="relative group flex items-center gap-4 bg-white rounded-xl p-4"
                      >

                        {profile?.image_url ? (

                          <img
                            src={profile.image_url}
                            alt={teacher.full_name ?? "Teacher"}
                            className="w-16 h-16 rounded-full object-cover"
                          />

                        ) : (

                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xl">
                            {(teacher.full_name ?? "T").charAt(0)}
                          </div>

                        )}



                        <div>

                          <p className="font-bold">
                            {teacher.full_name}
                          </p>


                          <p className="text-sm text-slate-500">
                            {profile?.specialization}
                          </p>


                          <p className="text-xs text-slate-400">
                            {profile?.experience_years ?? 0} سنوات خبرة
                          </p>

                        </div>



                        {profile?.bio && (

                          <div className="absolute hidden group-hover:block right-0 top-full mt-2 bg-slate-900 text-white p-4 rounded-xl w-72 z-20 text-sm shadow-lg">

                            {profile.bio}

                          </div>

                        )}


                      </div>

                    );

                  })}



                  <div className="space-y-2">

                    {offer.final_price &&
                    offer.final_price < offer.price ? (

                      <>

                        <p className="text-sm text-slate-400 line-through">
                          السعر الأساسي:
                          {" "}
                          {offer.price}
                          {" "}
                          JOD
                        </p>


                        <p className="text-red-600 font-bold">
                          خصم:
                          {" "}
                          {offer.discount_type === "percentage"
                            ? `${offer.discount_value}%`
                            : `${offer.discount_value} JOD`}
                        </p>


                        <p className="font-bold text-xl text-[#087a54]">
                          السعر النهائي:
                          {" "}
                          {offer.final_price}
                          {" "}
                          JOD
                        </p>

                      </>

                    ) : (

                      <p className="font-bold text-xl">
                        السعر:
                        {" "}
                        {offer.price}
                        {" "}
                        JOD
                      </p>

                    )}

                  </div>


                </div>

              ))}

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
  offerId={activeOffer?.id}
/>

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
