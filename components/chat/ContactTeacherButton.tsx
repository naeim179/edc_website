"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/app/actions/chat";

type Props = {
  courseId: string;
  teacherId: string;
};

export default function ContactTeacherButton({
  courseId,
  teacherId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const conversationId = await startConversation(
        courseId,
        teacherId
      );

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error(error);
      alert("تعذر فتح المحادثة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-[#1B4B43] px-5 py-2.5 text-sm font-bold text-[#1B4B43] transition hover:bg-[#F7F3EC] disabled:opacity-50"
    >
      💬 {loading ? "جاري الفتح..." : "تواصل مع المدرس"}
    </button>
  );
}
