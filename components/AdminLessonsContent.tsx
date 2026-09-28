"use client";

import LessonForm from "@/components/admin/LessonForm";
import DeleteLessonButton from "@/components/admin/DeleteLessonButton";
import { updateLesson } from "@/app/actions/admin-lessons";
import { useLanguage } from "@/components/LanguageProvider";

type Lesson = {
  id: string;
  title: string;
  order_index: number;
  content_url: string | null;
  is_free_preview: boolean;
};

type Props = {
  courseId: string;
  sectionId: string;
  sectionTitle: string;
  lessons: Lesson[];
};

export default function AdminLessonsContent({
  courseId,
  sectionId,
  sectionTitle,
  lessons,
}: Props) {

  const { language, t } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8">

        <h1 className="text-3xl font-bold">
          {t.admin.manageLessons}
        </h1>

        <p className="mt-2 text-blue-100">
          {`${t.admin.section}: ${sectionTitle}`}
        </p>

      </section>


      <LessonForm
        sectionId={sectionId}
        courseId={courseId}
      />


      {lessons.length > 0 ? (

        <div className="grid md:grid-cols-2 gap-5">

          {lessons.map((lesson) => {

            const updateAction =
              updateLesson.bind(
                null,
                lesson.id,
                courseId,
                sectionId
              );


            return (

              <div
                key={lesson.id}
                className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 space-y-5"
              >

                <div className="flex justify-between items-start">

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      lesson.is_free_preview
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {lesson.is_free_preview
                      ? t.admin.freePreview
                      : t.admin.locked}
                  </span>


                  <h2 className="text-lg font-bold text-slate-800">
                    {lesson.title}
                  </h2>

                </div>



                <form
                  action={updateAction}
                  className="space-y-4"
                >

                  <div>

                    <label className="block text-sm font-bold mb-2 text-slate-600">
                      {t.admin.lessonTitle}
                    </label>

                    <input
                      name="title"
                      defaultValue={lesson.title}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-right"
                      required
                    />

                  </div>



                  <div>

                    <label className="block text-sm font-bold mb-2 text-slate-600">
                      {t.admin.contentUrl}
                    </label>

                    <input
                      name="content_url"
                      defaultValue={lesson.content_url ?? ""}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                    />

                  </div>



                  <div>

                    <label className="block text-sm font-bold mb-2 text-slate-600">
                      {t.admin.lessonOrder}
                    </label>

                    <input
                      name="order_index"
                      type="number"
                      defaultValue={lesson.order_index}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3"
                    />

                  </div>



                  <label className="flex justify-end gap-2 items-center text-sm font-bold text-slate-700">

                    {t.admin.freePreview}

                    <input
                      type="checkbox"
                      name="is_free_preview"
                      defaultChecked={
                        lesson.is_free_preview
                      }
                    />

                  </label>



                  <button
                    type="submit"
                    className="w-full bg-[#124b8a] hover:bg-[#0d3b6e] text-white py-3 rounded-xl font-bold"
                  >
                    {t.admin.saveChanges}
                  </button>


                </form>



                <DeleteLessonButton
                  id={lesson.id}
                  courseId={courseId}
                  sectionId={sectionId}
                />


              </div>

            );

          })}

        </div>

      ) : (

        <div className="bg-white rounded-2xl border p-10 text-center text-slate-500">
          {t.admin.noLessons}
        </div>

      )}

    </div>
  );
}
