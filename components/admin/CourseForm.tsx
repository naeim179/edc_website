"use client";

import { useState } from "react";
import {
  createCourse,
  updateCourse,
} from "@/app/actions/admin-courses";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price?: number | null;
  currency?: string | null;
  is_free?: boolean;
  is_published: boolean;
};

export default function CourseForm({
  course,
}: {
  course?: Course;
}) {
  const isEditing = Boolean(course);

  const [isFree, setIsFree] = useState(
    course?.is_free ?? false
  );

  const [enableGroup, setEnableGroup] = useState(
    !isEditing
  );

  const [enablePrivate, setEnablePrivate] = useState(
    false
  );


  const action = course
    ? updateCourse.bind(null, course.id)
    : createCourse;


  return (
    <form
      action={action}
      className="space-y-6"
      dir="rtl"
    >

      <div>
        <label className="block mb-2 font-bold text-slate-700">
          اسم الدورة
        </label>

        <input
          name="title"
          required
          defaultValue={course?.title ?? ""}
          placeholder="مثال: Cyber Security"
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>


      <div>
        <label className="block mb-2 font-bold text-slate-700">
          وصف الدورة
        </label>

        <textarea
          name="description"
          rows={4}
          defaultValue={
            course?.description ?? ""
          }
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>


      <div>
        <label className="block mb-2 font-bold text-slate-700">
          التصنيف
        </label>

        <input
          name="category"
          defaultValue={
            course?.category ?? ""
          }
          placeholder="Programming"
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>


      {!isEditing && (
        <div className="bg-white border rounded-xl p-5 space-y-5">

          <h2 className="font-bold text-lg">
            طرق التسجيل
          </h2>


          <div className="border rounded-xl p-4">

            <label className="flex items-center gap-3 font-bold">

              <input
                type="checkbox"
                name="group_enabled"
                checked={enableGroup}
                onChange={(e) =>
                  setEnableGroup(
                    e.target.checked
                  )
                }
              />

              Group Course
            </label>


            {enableGroup && (
              <input
                name="group_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="السعر الشهري"
                className="mt-4 w-full border rounded-xl px-4 py-3"
              />
            )}

          </div>



          <div className="border rounded-xl p-4">

            <label className="flex items-center gap-3 font-bold">

              <input
                type="checkbox"
                name="private_enabled"
                checked={enablePrivate}
                onChange={(e) =>
                  setEnablePrivate(
                    e.target.checked
                  )
                }
              />

              Private Course
            </label>


            {enablePrivate && (
              <input
                name="private_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="السعر الشهري"
                className="mt-4 w-full border rounded-xl px-4 py-3"
              />
            )}

          </div>


        </div>
      )}



      {isEditing && (
        <div className="border rounded-xl p-4">

          <label className="flex items-center gap-3 font-bold">

            <input
              name="is_free"
              type="checkbox"
              checked={isFree}
              onChange={(e) =>
                setIsFree(
                  e.target.checked
                )
              }
            />

            دورة مجانية
          </label>

        </div>
      )}



      <div className="border rounded-xl p-4">

        <label className="flex items-center gap-3 font-bold">

          <input
            name="is_published"
            type="checkbox"
            defaultChecked={
              course?.is_published ?? false
            }
          />

          نشر الدورة
        </label>

      </div>



      <button
        type="submit"
        className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
      >
        {isEditing
          ? "حفظ التعديلات"
          : "إنشاء الدورة"}
      </button>


    </form>
  );
}
