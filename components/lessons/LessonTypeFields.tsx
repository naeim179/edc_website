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
        <label htmlFor={`lesson-type-${courseId}`} className="block mb-2 font-bold">
          {t.lessonType.type}
        </label>

        <select
          id={`lesson-type-${courseId}`}
          name="lesson_type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
        >
          <option value="recorded">
            {t.lessonType.recorded}
          </option>

          <option value="live">
            {t.lessonType.live}
          </option>
        </select>
      </div>

      {type === "recorded" && <LessonVideoFields courseId={courseId} />}
      {type === "live" && (
        <>
          <div>
            <label htmlFor={`lesson-platform-${courseId}`} className="block mb-2 font-bold">
              {t.lessonType.platform}
            </label>

            <select
              id={`lesson-platform-${courseId}`}
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
            <label htmlFor={`lesson-url-${courseId}`} className="block mb-2 font-bold">
              {t.lessonType.sessionLink}
            </label>

            <input
              id={`lesson-url-${courseId}`}
              name="content_url"
              placeholder={t.lessonType.sessionPlaceholder}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor={`lesson-schedule-${courseId}`} className="block mb-2 font-bold">
              {t.lessonType.schedule}
            </label>

            <input
              id={`lesson-schedule-${courseId}`}
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
