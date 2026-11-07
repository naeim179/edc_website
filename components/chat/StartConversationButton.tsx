"use client";

import {
  useTransition,
  useState,
} from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  useRouter,
} from "next/navigation";

import {
  startConversation,
} from "@/app/actions/chat";


export default function StartConversationButton({
  courseId,
}: {
  courseId: string;
  teacherId?: string;
}) {
  const { language } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();


  function handleClick() {
    if (isPending) return;
    setErrorMessage(null);
    startTransition(
      async () => {
        try {
          const conversationId =
            await startConversation(
              courseId
            );

          router.push(
            `/messages/${conversationId}`
          );
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : language === "ar" ? "تعذر فتح المحادثة" : "Unable to open conversation");
        }
      }
    );
  }


  return (
    <div>
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl bg-[#087a54] px-5 py-2.5 font-bold text-white disabled:opacity-50"
    >
      {isPending
        ? (language === "ar" ? "جاري الفتح..." : "Opening...")
        : (language === "ar" ? "تواصل مع المدرس" : "Contact instructor")}
    </button>
    {errorMessage && <p role="alert" className="mt-2 text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
