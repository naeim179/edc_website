"use client";

import { useTransition } from "react";
import { createOrder } from "@/app/actions/orders";

export default function BuyCourseButton({
  courseId,
  subscriptionMonths = 1,
  autoRenew = false,
  label = "الانتقال للدفع",
}: {
  courseId: string;
  subscriptionMonths?: 1 | 3;
  autoRenew?: boolean;
  label?: string;
}) {
  const [
    pending,
    startTransition,
  ] = useTransition();

  function handleBuy() {
    if (pending) return;

    startTransition(async () => {
      await createOrder(
        courseId,
        subscriptionMonths,
        autoRenew
      );
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleBuy}
      className="w-full bg-[#087a54] hover:bg-[#066844] text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending
        ? "جاري تحويلك لصفحة الدفع..."
        : label}
    </button>
  );
}
