"use client";

import {
  useTransition,
} from "react";

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
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();


  function handleClick() {
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
          console.error(
            error
          );
        }
      }
    );
  }


  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl bg-[#087a54] px-5 py-2.5 font-bold text-white disabled:opacity-50"
    >
      {isPending
        ? "جاري الفتح..."
        : "تواصل مع المدرس"}
    </button>
  );
}
