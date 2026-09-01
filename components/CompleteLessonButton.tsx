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
    <div className="mt-6 space-y-2">
      <button
        onClick={handleComplete}
        disabled={loading || completed}
        className={`px-6 py-3 text-white font-bold rounded-xl transition-all ${
          completed
            ? "bg-slate-400 cursor-not-allowed opacity-70"
            : "bg-[#087a54] hover:bg-[#066b49]"
        }`}
      >
        {loading
          ? "جاري الحفظ..."
          : completed
          ? "تم إكمال الدرس"
          : "إكمال الدرس"}
      </button>

      {message && (
        <p className="text-sm text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}
