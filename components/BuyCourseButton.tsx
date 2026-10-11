"use client";

import {
  useTransition,
} from "react";

import {
  createOrder,
} from "@/app/actions/orders";

import {
  useLanguage,
} from "@/components/LanguageProvider";

export default function BuyCourseButton({
  courseId,
  subscriptionMonths = 1,
  autoRenew = false,
  paymentMethod = "paytabs",
  label,
  couponCode = "",
  privateBookingId,
  disabled = false,
}: {
  courseId: string;
  subscriptionMonths?:
    | 1
    | 3;
  autoRenew?: boolean;
  paymentMethod?:
    | "paytabs"
    | "paypal"
    | "cliq";
  label?: string;
  couponCode?: string;
  privateBookingId?:
    | string
    | null;
  disabled?: boolean;
}) {
  const {
    t,
  } = useLanguage();

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  function handleBuy() {
    if (
      pending ||
      disabled
    ) {
      return;
    }

    startTransition(
      async () => {
        await createOrder(
          courseId,
          subscriptionMonths,
          autoRenew,
          paymentMethod,
          couponCode,
          privateBookingId ??
            undefined
        );
      }
    );
  }

  return (
    <button
      type="button"
      disabled={
        pending ||
        disabled
      }
      onClick={
        handleBuy
      }
      className="w-full rounded-xl bg-[#C9704A] px-6 py-3.5 font-bold text-white transition hover:bg-[#B15F3B] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? t.booking.paying
        : label ??
          t.booking.continueToPayment}
    </button>
  );
}
