"use client";

import {
  useState,
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

  const isArabic = /[\u0600-\u06FF]/.test(
    t.booking.continueToPayment
  );

  const [errorCode, setErrorCode] = useState<
    "pending" | "uncertain" | "generic" | null
  >(null);

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

    setErrorCode(null);

    startTransition(async () => {
      try {
        const result = await createOrder(
          courseId,
          subscriptionMonths,
          autoRenew,
          paymentMethod,
          couponCode,
          privateBookingId ?? undefined
        );

        if (result && typeof result === "object" && "checkoutError" in result) {
          setErrorCode(
            result.checkoutError === "PAYMENT_PENDING_REVIEW"
              ? "pending"
              : result.checkoutError === "PAYMENT_INIT_UNCERTAIN"
                ? "uncertain"
                : "generic"
          );
        }
      } catch {
        setErrorCode("generic");
      }
    });
  }

  return (
    <div className="w-full">
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

      {errorCode && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {errorCode === "pending"
            ? isArabic
              ? "توجد عملية دفع سابقة لهذه الدورة قيد التحقق. يرجى التواصل مع الدعم قبل إعادة المحاولة."
              : "A previous payment for this course is still under review. Please contact support before retrying."
            : errorCode === "uncertain"
              ? isArabic
                ? "تعذر تأكيد إنشاء صفحة الدفع. يرجى التواصل مع الدعم قبل المحاولة مجددًا."
                : "Payment page creation could not be confirmed. Please contact support before retrying."
              : isArabic
                ? "تعذر إكمال الطلب. يرجى التواصل مع الدعم قبل إعادة الدفع."
                : "Unable to complete the request. Please contact support before retrying payment."}
        </p>
      )}
    </div>
  );
}
