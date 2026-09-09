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
  const [isFree, setIsFree] = useState(course?.is_free ?? false);

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
        <label
          htmlFor="title"
          className="block mb-2 font-bold text-slate-700"
        >
          اسم الدورة
        </label>

        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={course?.title ?? ""}
          placeholder="مثال: أساسيات البرمجة"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block mb-2 font-bold text-slate-700"
        >
          وصف الدورة
        </label>

        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={course?.description ?? ""}
          placeholder="اكتب وصفًا مختصرًا للدورة..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 resize-y"
        />
      </div>

      <div>
        <label
          htmlFor="category"
          className="block mb-2 font-bold text-slate-700"
        >
          التصنيف
        </label>

        <input
          id="category"
          name="category"
          type="text"
          defaultValue={course?.category ?? ""}
          placeholder="مثال: Programming"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            name="is_free"
            type="checkbox"
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
            className="h-5 w-5"
          />

          <span className="font-bold text-slate-700">
            دورة مجانية
          </span>
        </label>

        <p className="text-sm text-slate-500 mt-2">
          عند تفعيل هذا الخيار لن يحتاج الطالب إلى الدفع للتسجيل.
        </p>
      </div>

      {!isFree && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="price"
              className="block mb-2 font-bold text-slate-700"
            >
              سعر الدورة
            </label>

            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={course?.price ?? 0}
              placeholder="10.00"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="currency"
              className="block mb-2 font-bold text-slate-700"
            >
              العملة
            </label>

            <select
              id="currency"
              name="currency"
              defaultValue={course?.currency ?? "JOD"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 bg-white"
            >
              <option value="JOD">JOD - دينار أردني</option>
              <option value="USD">USD - دولار أمريكي</option>
            </select>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            name="is_published"
            type="checkbox"
            defaultChecked={course?.is_published ?? false}
            className="h-5 w-5"
          />

          <span className="font-bold text-slate-700">
            نشر الدورة
          </span>
        </label>

        <p className="text-sm text-slate-500 mt-2">
          الدورة المنشورة ستظهر للطلاب في قائمة الدورات.
        </p>
      </div>

      <div className="flex justify-start">
        <button
          type="submit"
          className="rounded-xl bg-[#087a54] px-6 py-3 font-bold text-white hover:bg-[#066b49] transition"
        >
          {isEditing ? "حفظ التعديلات" : "إنشاء الدورة"}
        </button>
      </div>
    </form>
  );
}
