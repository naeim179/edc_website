"use client";

import { createOrder } from "@/app/actions/orders";
import { useTransition } from "react";


export default function BuyCourseButton({
  courseId,
}: {
  courseId: string;
}) {

  const [pending, startTransition] = useTransition();


  function handleBuy() {

    if (pending) return;


    startTransition(async () => {
      await createOrder(courseId);
    });

  }


  return (
    <button
      disabled={pending}
      onClick={handleBuy}
      className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending
        ? "جاري إنشاء الطلب..."
        : "شراء الآن"}
    </button>
  );
}
