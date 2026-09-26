"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/app/actions/chat";

export default function StartConversationButton({
  courseId,
  teacherId,
}: {
  courseId: string;
  teacherId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const conversationId = await startConversation(courseId, teacherId);
        router.push(`/messages/${conversationId}`);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="bg-[#087a54] text-white px-5 py-2 rounded-lg font-bold disabled:opacity-50"
    >
      {isPending ? "جاري الفتح..." : "تواصل مع المدرس"}
    </button>
  );
}
