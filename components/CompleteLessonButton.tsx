"use client";

import { useState } from "react";
import { completeLesson } from "@/app/actions/enrollment";

export default function CompleteLessonButton({
  enrollmentId,
  lessonId,
  initialCompleted,
}: {
  enrollmentId: string;
  lessonId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleComplete() {
    if (completed) return;

    try {
      setLoading(true);
      setMessage("");

      await completeLesson(enrollmentId, lessonId);

      setCompleted(true);
      setMessage("تم إكمال الدرس بنجاح");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-3">

      <button
        onClick={handleComplete}
        disabled={loading || completed}
        className={`
          w-full md:w-auto px-10 py-3.5 rounded-xl
          text-white font-bold transition-all shadow-sm
          ${
            completed
              ? "bg-emerald-500 cursor-not-allowed"
              : "bg-[#124b8a] hover:bg-[#0d3b6e]"
          }
          disabled:opacity-80
        `}
      >
        {loading
          ? "جاري الحفظ..."
          : completed
          ? "✅ تم إكمال الدرس"
          : "إكمال الدرس"}
      </button>


      {message && (
        <div className="inline-flex px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold">
          {message}
        </div>
      )}

    </div>
  );
}
