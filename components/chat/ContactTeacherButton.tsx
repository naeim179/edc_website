"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  startConversation,
} from "@/app/actions/chat";


type Props = {
  courseId: string;
};


export default function ContactTeacherButton({
  courseId,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  async function handleClick() {
    try {
      setLoading(true);
      setError(null);

      const conversationId =
        await startConversation(
          courseId
        );

      router.push(
        `/messages/${conversationId}`
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "تعذر فتح المحادثة"
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#087a54] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#066b49] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        <span aria-hidden="true">
          💬
        </span>

        {loading
          ? "جاري فتح المحادثة..."
          : "تواصل مع المدرس"}
      </button>

      {error && (
        <p className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
