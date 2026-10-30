"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  releasePrivateSchedule,
} from "@/app/actions/private-booking";

import {
  useLanguage,
} from "@/components/LanguageProvider";

export default function CancelPrivateHoldButton({
  bookingId,
  courseId,
  compact = false,
}: {
  bookingId: string;
  courseId: string;
  compact?: boolean;
}) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.booking;

  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const [
    confirming,
    setConfirming,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  function cancelBooking() {
    setError("");

    startTransition(
      async () => {
        try {
          const result = await releasePrivateSchedule(
            bookingId
          );

          if (!result.success) {
            setError(
              isArabic
                ? "لا يزال طلب الدفع قيد التحقق. إذا ألغيت الدفع، حاول مرة أخرى بعد انتهاء صفحة الدفع."
                : "Payment is still being verified. If you cancelled, try again after the payment page expires."
            );
            return;
          }

          router.replace(
            `/courses/${courseId}`
          );

          router.refresh();
        } catch {
          setError(
            copy.cancelError
          );
        }
      }
    );
  }

  if (confirming) {
    return (
      <div
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        className={`${
          compact
            ? "w-full"
            : "w-full sm:w-auto"
        } rounded-2xl border border-red-200 bg-red-50 p-3`}
      >
        <p className="text-sm font-bold text-red-700">
          {
            copy.cancelConfirmTitle
          }
        </p>

        <p className="mt-1 text-xs leading-5 text-red-600/80">
          {
            copy.cancelConfirmText
          }
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={
              pending
            }
            onClick={
              cancelBooking
            }
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending
              ? copy.canceling
              : copy.confirmCancel}
          </button>

          <button
            type="button"
            disabled={
              pending
            }
            onClick={() =>
              setConfirming(
                false
              )
            }
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700"
          >
            {
              copy.back
            }
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs font-bold text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={
        pending
      }
      onClick={() =>
        setConfirming(true)
      }
      className={`inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-5 py-3.5 font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50 ${
        compact
          ? "w-full"
          : "w-full sm:w-auto"
      }`}
    >
      {
        copy.cancelBooking
      }
    </button>
  );
}
