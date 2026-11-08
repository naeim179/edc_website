"use client";

import LessonVideoFields from "@/components/lessons/LessonVideoFields";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function LessonTypeFields({courseId}: {courseId: string}) {
  const { t } = useLanguage();
  const [type, setType] = useState("recorded");

  return (
    <>
      <div>
        <label className="block mb-2 font-bold">
          نوع الدرس
        </label>

        <select
          name="lesson_type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
        >
          <option value="recorded">
            درس مسجل
          </option>

          <option value="live">
            درس مباشر
          </option>
        </select>
      </div>

      {type === "recorded" && <LessonVideoFields courseId={courseId} />}
      {type === "live" && (
        <>
          <div>
            <label className="block mb-2 font-bold">
              منصة البث
            </label>

            <select
              name="live_platform"
              defaultValue="zoom"
              className="w-full border rounded-xl px-4 py-3"
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
            <label className="block mb-2 font-bold">
              رابط الجلسة
            </label>

            <input
              name="content_url"
              placeholder={t.lessonType.sessionPlaceholder}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-bold">
              موعد الجلسة
            </label>

            <input
              name="live_schedule"
              placeholder={t.lessonType.schedulePlaceholder}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>
        </>
      )}
    </>
  );
}
