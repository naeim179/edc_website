"use client";

import Link from "next/link";
import SectionForm from "@/components/admin/SectionForm";
import {
  deleteSection,
  updateSection,
} from "@/app/actions/admin-sections";
import { useLanguage } from "@/components/LanguageProvider";

type Section = {
  id: string;
  title: string;
  order_index: number;
};

type Props = {
  courseId: string;
  courseTitle: string;
  sections: Section[];
};

export default function AdminSectionsContent({
  courseId,
  courseTitle,
  sections,
}: Props) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <Link
          href={`/admin/courses/${courseId}/edit`}
          className="text-sm text-blue-100 font-bold hover:text-white"
        >
          {isArabic ? "العودة للدورة" : "Back to course"}
        </Link>


        <h1 className="text-3xl font-bold mt-5">
          {isArabic
            ? "محتوى الدورة"
            : "Course Content"}
        </h1>


        <p className="mt-2 text-blue-100">
          {courseTitle}
        </p>

      </section>


      <SectionForm
        courseId={courseId}
      />


      {sections.length > 0 ? (

        <div className="grid md:grid-cols-2 gap-5">

          {sections.map((section) => {

            const updateAction =
              updateSection.bind(
                null,
                section.id,
                courseId
              );


            const deleteAction =
              deleteSection.bind(
                null,
                section.id,
                courseId
              );


            return (

              <div
                key={section.id}
                className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 space-y-5"
              >

                <div className="flex justify-between items-start">

                  <span className="px-3 py-1 rounded-full bg-blue-50 text-[#124b8a] text-xs font-bold">
                    {isArabic
                      ? `قسم ${section.order_index}`
                      : `Section ${section.order_index}`}
                  </span>


                  <h2 className="font-bold text-lg text-slate-800 text-right">
                    {section.title}
                  </h2>

                </div>



                <form
                  action={updateAction}
                  className="space-y-4"
                >

                  <div>

                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      {isArabic
                        ? "اسم القسم"
                        : "Section name"}
                    </label>


                    <input
                      name="title"
                      defaultValue={section.title}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-right"
                      required
                    />

                  </div>



                  <div>

                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      {isArabic
                        ? "ترتيب القسم"
                        : "Section order"}
                    </label>


                    <input
                      name="order_index"
                      type="number"
                      min="1"
                      defaultValue={section.order_index}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                      required
                    />

                  </div>



                  <button
                    type="submit"
                    className="w-full bg-[#124b8a] hover:bg-[#0d3b6e] text-white py-3 rounded-xl font-bold transition"
                  >
                    {isArabic
                      ? "حفظ التعديل"
                      : "Save Changes"}
                  </button>


                </form>



                <div className="flex gap-3">

                  <Link
                    href={`/admin/courses/${courseId}/sections/${section.id}/lessons`}
                    className="flex-1 text-center bg-emerald-50 hover:bg-emerald-100 text-[#087a54] py-3 rounded-xl font-bold"
                  >
                    {isArabic
                      ? "إدارة الدروس"
                      : "Manage Lessons"}
                  </Link>


                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="px-5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold"
                    >
                      {isArabic
                        ? "حذف"
                        : "Delete"}
                    </button>
                  </form>


                </div>


              </div>

            );

          })}

        </div>

      ) : (

        <div className="bg-white rounded-2xl border p-10 text-center text-slate-500">
          {isArabic
            ? "لا توجد أقسام بعد."
            : "No sections yet."}
        </div>

      )}


    </div>
  );
}
