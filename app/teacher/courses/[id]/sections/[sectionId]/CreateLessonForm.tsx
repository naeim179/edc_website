"use client";

import { useState } from "react";
import { createTeacherLesson } from "@/app/actions/teacher-content";

export default function CreateLessonForm({
  courseId,
  sectionId,
}: {
  courseId: string;
  sectionId: string;
}) {

  const [lessonType, setLessonType] = useState("recorded");

  const action =
    createTeacherLesson.bind(
      null,
      sectionId,
      courseId
    );

  return (
    <form
      action={action}
      className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl"
    >

      <input
        name="title"
        placeholder="اسم الدرس"
        required
        className="w-full border rounded-xl px-4 py-2"
      />


      <input
        name="content_url"
        placeholder="رابط الفيديو أو المحتوى"
        className="w-full border rounded-xl px-4 py-2"
      />


      <div className="space-y-2">

        <label className="block font-semibold">
          نوع الدرس
        </label>

        <select
          name="lesson_type"
          value={lessonType}
          onChange={(e) => setLessonType(e.target.value)}
          className="w-full border rounded-xl px-4 py-2"
        >

          <option value="recorded">
            درس مسجل
          </option>

          <option value="live">
            درس مباشر
          </option>

        </select>

      </div>


      {lessonType === "live" && (
        <>

          <div className="space-y-2">

            <label className="block font-semibold">
              منصة البث
            </label>

            <select
              name="live_platform"
              className="w-full border rounded-xl px-4 py-2"
              defaultValue="zoom"
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


          <div className="space-y-2">

            <label className="block font-semibold">
              موعد الجلسة
            </label>

            <input
              name="live_schedule"
              placeholder="مثال: الأحد 8:00 مساء"
              className="w-full border rounded-xl px-4 py-2"
            />

          </div>

        </>
      )}


      <button
        className="bg-[#087a54] text-white px-4 py-2 rounded-xl font-bold"
      >
        إضافة الدرس
      </button>


    </form>
  );
}
