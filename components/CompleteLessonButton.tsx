"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { CheckCircleIcon } from "@/components/icons";
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
  const router = useRouter();
  const { language } = useLanguage();
  const ar = language === "ar";
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
      setMessage(ar ? "تم إكمال الدرس بنجاح" : "Lesson completed successfully");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : ar ? "حدث خطأ غير متوقع" : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">

      <button
        onClick={handleComplete}
        disabled={loading || completed}
        className={`
          inline-flex items-center justify-center gap-2 w-full md:w-auto px-5 py-3 rounded-md
          font-semibold transition-colors text-sm
          ${
            completed
              ? "bg-[var(--brand-success-bg)] text-[var(--brand-success)] cursor-not-allowed"
              : "bg-[var(--brand-ink)] text-[var(--brand-on-ink)] hover:bg-[var(--brand-ink-hover)]"
          }
          disabled:opacity-80
        `}
      >
        {completed && <CheckCircleIcon width={16} height={16} />}
        {loading ? (ar ? "جاري الحفظ..." : "Saving...") : completed ? (ar ? "تم إكمال الدرس" : "Lesson completed") : (ar ? "إكمال الدرس" : "Complete lesson")}
      </button>


      {message && (
        <div className="inline-flex px-4 py-2 rounded-md bg-[var(--brand-success-bg)] text-[var(--brand-success)] text-sm font-bold">
          {message}
        </div>
      )}

    </div>
  );
}
