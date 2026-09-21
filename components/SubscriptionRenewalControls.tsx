"use client";

import Link from "next/link";
import { useTransition } from "react";

import { disableAutoRenew } from "@/app/actions/subscriptions";
import { useLanguage } from "@/components/LanguageProvider";

export default function SubscriptionRenewalControls({
  courseId,
  expiresAt,
  autoRenew,
  accessActive,
  daysRemaining,
}: {
  courseId: string;
  expiresAt: string | null;
  autoRenew: boolean;
  accessActive: boolean;
  daysRemaining: number | null;
}) {
  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    pending,
    startTransition,
  ] = useTransition();

  // Legacy enrollment: unlimited access.
  if (!expiresAt) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
        {isArabic
          ? "هذا التسجيل الحالي لا يحتوي على تاريخ انتهاء."
          : "This enrollment currently has no expiration date."}
      </div>
    );
  }

  const expiryDate =
    new Date(expiresAt);

  const remainingDays =
    daysRemaining ?? 0;

  function stopAutoRenew() {
    if (pending) {
      return;
    }

    startTransition(async () => {
      await disableAutoRenew(
        courseId
      );

      window.location.reload();
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {isArabic
              ? "صلاحية الاشتراك حتى"
              : "Subscription valid until"}
          </p>

          <p className="mt-1 font-bold text-slate-800">
            {expiryDate.toLocaleDateString(
              isArabic
                ? "ar-JO"
                : "en-US"
            )}
          </p>

          {accessActive && (
            <p className="mt-1 text-xs text-slate-500">
              {isArabic
                ? `متبقي تقريبًا ${remainingDays} يوم`
                : `About ${remainingDays} days remaining`}
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            autoRenew
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {autoRenew
            ? isArabic
              ? "التجديد التلقائي مفعّل"
              : "Auto renewal on"
            : isArabic
            ? "التجديد يدوي"
            : "Manual renewal"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/checkout/${courseId}`}
          className="rounded-xl bg-[#124b8a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d3b6e]"
        >
          {accessActive
            ? isArabic
              ? "تمديد الاشتراك"
              : "Extend subscription"
            : isArabic
            ? "تجديد الاشتراك"
            : "Renew subscription"}
        </Link>

        {autoRenew && (
          <button
            type="button"
            disabled={pending}
            onClick={
              stopAutoRenew
            }
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 disabled:opacity-50"
          >
            {pending
              ? "..."
              : isArabic
              ? "إيقاف التجديد التلقائي"
              : "Disable auto renewal"}
          </button>
        )}
      </div>

      {!autoRenew && accessActive && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {isArabic
            ? "لتفعيل التجديد التلقائي لاحقًا، اختره عند عملية التجديد القادمة حتى توافق على حفظ رمز دفع آمن لدى PayTabs."
            : "To enable auto renewal later, select it during your next renewal so PayTabs can create a secure payment token."}
        </p>
      )}
    </div>
  );
}
