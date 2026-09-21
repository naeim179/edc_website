"use client";

import { useTransition } from "react";
import { createOrder } from "@/app/actions/orders";
import type { PaymentCurrency } from "@/lib/currency";

export default function BuyCourseButton({
  courseId,
  subscriptionMonths = 1,
  paymentCurrency = "USD",
  autoRenew = false,
  label = "متابعة إلى الدفع",
}: {
  courseId: string;
  subscriptionMonths?: 1 | 3;
  paymentCurrency?: PaymentCurrency;
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
        autoRenew,
        paymentCurrency
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
