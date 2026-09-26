"use client";

import { useState } from "react";

export default function LessonTypeFields() {
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
              placeholder="رابط Zoom أو Meet"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-bold">
              موعد الجلسة
            </label>

            <input
              name="live_schedule"
              placeholder="مثال: 2026-10-01 8:00 PM"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>
        </>
      )}
    </>
  );
}
