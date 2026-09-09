"use client";

import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createSection } from "@/app/actions/admin-sections";

export default function SectionForm({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();

  const formRef =
    useRef<HTMLFormElement>(null);

  const [isPending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await createSection(
          courseId,
          formData
        );

        setSuccess(result.success);
        setMessage(result.message);

        if (result.success) {
          formRef.current?.reset();

          router.refresh();
        }
      } catch (error) {
        setSuccess(false);

        setMessage(
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع."
        );
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border p-5 space-y-4 text-right"
    >
      <div>
        <label
          htmlFor="section-title"
          className="block mb-2 font-bold text-slate-700"
        >
          اسم القسم
        </label>

        <input
          id="section-title"
          name="title"
          placeholder="مثال: المقدمة"
          className="w-full border rounded-lg p-3"
          required
          disabled={isPending}
        />
      </div>

      <p className="text-sm text-slate-500">
        سيتم تحديد ترتيب القسم تلقائيًا.
      </p>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#087a54] text-white px-5 py-3 rounded-lg font-bold disabled:opacity-50"
      >
        {isPending
          ? "جاري الإضافة..."
          : "إضافة قسم"}
      </button>
    </form>
  );
}
