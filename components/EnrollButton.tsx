"use client";

import { useEffect, useState } from "react";
import {
  enrollInCourse,
  checkEnrollmentStatus,
} from "@/app/actions/enrollment";

export default function EnrollButton({
  courseId,
}: {
  courseId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await checkEnrollmentStatus(courseId);
        setEnrolled(status);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع"
        );
      } finally {
        setChecking(false);
      }
    }

    checkStatus();
  }, [courseId]);

  async function handleEnroll() {
    try {
      setLoading(true);
      setMessage("");

      const result = await enrollInCourse(courseId);

      setEnrolled(true);

      if (result.alreadyEnrolled) {
        setMessage("أنت مسجل في هذه الدورة مسبقًا");
      } else {
        setMessage("تم التسجيل في الدورة بنجاح");
      }
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

  if (checking) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        جاري التحقق...
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading || enrolled}
        className="px-6 py-3 bg-[#087a54] hover:bg-[#066b49] disabled:opacity-50 text-white font-bold rounded-xl transition-all"
      >
        {loading
          ? "جاري التسجيل..."
          : enrolled
          ? "أنت مسجل في الدورة"
          : "التسجيل في الدورة"}
      </button>

      {message && (
        <p className="text-sm text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}
