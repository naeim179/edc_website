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
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  is_free?: boolean;
  is_published: boolean;
  course_type?: string;
  delivery_type?: "recorded" | "live";
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
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

  const [courseType, setCourseType] = useState<"group" | "private">(
    course?.course_type === "private" ? "private" : "group"
  );

  const [deliveryType, setDeliveryType] = useState<"recorded" | "live">(
    course?.delivery_type === "live" ? "live" : "recorded"
  );

  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed"
  >(course?.discount_type ?? "percentage");

  const [discountValue, setDiscountValue] = useState(
    course?.discount_value ?? 0
  );

  const price = course?.price ?? 0;

  const calculatedFinalPrice =
    discountType === "percentage"
      ? Math.max(
          0,
          price - price * (Number(discountValue) / 100)
        )
      : Math.max(
          0,
          price - Number(discountValue)
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
          defaultValue={course?.description ?? ""}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div>
        <label className="block mb-2 font-bold text-slate-700">
          التصنيف
        </label>

        <input
          name="category"
          defaultValue={course?.category ?? ""}
          placeholder="Programming"
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div>
        <label className="block mb-2 font-bold text-slate-700">
          صورة الدورة
        </label>

        <input
          name="image_url"
          type="url"
          defaultValue={course?.image_url ?? ""}
          placeholder="https://example.com/course-image.jpg"
          className="w-full rounded-xl border px-4 py-3"
        />

        <p className="text-xs text-slate-400 mt-2">
          ضع رابط مباشر للصورة.
        </p>
      </div>

      {!isEditing && (
        <div className="bg-white border rounded-xl p-5 space-y-5">
          <h2 className="font-bold text-lg">
            نوع الدورة
          </h2>

          <div className="border rounded-xl p-4 space-y-4">
            <label className="flex items-center gap-3 font-bold">
              <input
                type="radio"
                name="course_type"
                value="group"
                checked={courseType === "group"}
                onChange={() => setCourseType("group")}
              />

              Group Course
            </label>

            <label className="flex items-center gap-3 font-bold">
              <input
                type="radio"
                name="course_type"
                value="private"
                checked={courseType === "private"}
                onChange={() => setCourseType("private")}
              />

              Private Course
            </label>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 space-y-5">
        <h2 className="font-bold text-lg">
          نوع المحتوى
        </h2>

        <label className="flex items-center gap-3 font-bold">
          <input
            type="radio"
            name="delivery_type"
            value="recorded"
            checked={deliveryType === "recorded"}
            onChange={() => setDeliveryType("recorded")}
          />

          دورة مسجلة
        </label>

        <label className="flex items-center gap-3 font-bold">
          <input
            type="radio"
            name="delivery_type"
            value="live"
            checked={deliveryType === "live"}
            onChange={() => setDeliveryType("live")}
          />

          دورة مباشرة
        </label>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-5">
        <h2 className="font-bold text-lg">
          السعر
        </h2>

        <div>
          <label className="block mb-2 font-bold text-slate-700">
            السعر الأساسي بالدولار (USD)
          </label>

          <input
            name="course_price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={course?.price ?? 0}
            placeholder="مثال: 68"
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div className="border-t pt-5 space-y-4">
          <h3 className="font-bold">
            الخصم
          </h3>

          <div>
            <label className="block mb-2 font-bold text-slate-700">
              نوع الخصم
            </label>

            <select
              name="discount_type"
              value={discountType}
              onChange={(e) =>
                setDiscountType(
                  e.target.value as "percentage" | "fixed"
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="percentage">
                نسبة مئوية (%)
              </option>

              <option value="fixed">
                مبلغ ثابت (USD)
              </option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-bold text-slate-700">
              قيمة الخصم
            </label>

            <input
              name="discount_value"
              type="number"
              min="0"
              max={
                discountType === "percentage"
                  ? 100
                  : undefined
              }
              step="0.01"
              value={discountValue}
              onChange={(e) =>
                setDiscountValue(
                  Number(e.target.value)
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-sm text-slate-500">
              السعر النهائي
            </p>

            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {calculatedFinalPrice.toFixed(2)} USD
            </p>

            {discountValue > 0 && (
              <p className="text-sm text-slate-400 mt-1 line-through">
                {price.toFixed(2)} USD
              </p>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="border rounded-xl p-4">
          <label className="flex items-center gap-3 font-bold">
            <input
              name="is_free"
              type="checkbox"
              checked={isFree}
              onChange={(e) =>
                setIsFree(e.target.checked)
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
