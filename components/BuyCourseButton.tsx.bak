"use client";

import { useTransition } from "react";
import { createOrder } from "@/app/actions/orders";

export default function BuyCourseButton({
  courseId,
  subscriptionMonths = 1,
  autoRenew = false,
  label = "متابعة إلى الدفع",
}: {
  courseId: string;
  subscriptionMonths?: 1 | 3;
  autoRenew?: boolean;
  label?: string;
}) {
  const [pending, startTransition] =
    useTransition();

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
      className="w-full rounded-xl bg-[#124b8a] px-6 py-3.5 font-bold text-white transition hover:bg-[#0d3b6e] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "جاري تحويلك إلى الدفع..."
        : label}
    </button>
  );
}
