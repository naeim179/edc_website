"use client";

import { useState } from "react";
import { createLesson } from "@/app/actions/admin-lessons";
import LessonVideoFields from "@/components/lessons/LessonVideoFields";

export default function LessonForm({
  sectionId,
  courseId,
}: {
  sectionId: string;
  courseId: string;
}) {
  const [lessonType, setLessonType] = useState("recorded");

  const action = createLesson.bind(
    null,
    sectionId,
    courseId
  );

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border bg-white p-6 text-right"
      dir="rtl"
    >
      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          عنوان الدرس
        </label>

        <input
          name="title"
          placeholder="مثال: مقدمة في الأمن السيبراني"
          className="w-full rounded-xl border px-4 py-3"
          required
        />
      </div>


      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          نوع الدرس
        </label>

        <select
          name="lesson_type"
          value={lessonType}
          onChange={(e) => setLessonType(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="recorded">
            درس مسجل
          </option>

          <option value="live">
            درس مباشر
          </option>
        </select>
      </div>


      {lessonType === "recorded" && (
        <LessonVideoFields courseId={courseId} />
      )}


      {lessonType === "live" && (
        <>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              منصة البث
            </label>

            <select
              name="live_platform"
              defaultValue="zoom"
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="zoom">
                Zoom
              </option>

              <option value="google_meet">
                Google Meet
              </option>

              <option value="teams">
                Microsoft Teams
              </option>

              <option value="youtube">
                YouTube Live
              </option>
            </select>
          </div>


          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              رابط الجلسة
            </label>

            <input
              name="content_url"
              placeholder="ضع رابط Zoom أو Meet"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>


          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              موعد الجلسة
            </label>

            <input
              name="live_schedule"
              placeholder="مثال: الأحد 8:00 مساء"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>
        </>
      )}


      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          ترتيب الدرس
        </label>

        <input
          name="order_index"
          type="number"
          min="0"
          defaultValue={0}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>


      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_free_preview"
        />

        <span className="font-bold text-slate-700">
          معاينة مجانية
        </span>
      </label>


      <button className="w-full rounded-xl bg-[#087a54] px-5 py-3 font-bold text-white">
        إضافة درس
      </button>
    </form>
  );
}
