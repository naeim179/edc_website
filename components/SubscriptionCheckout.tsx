"use client";

import { useState } from "react";
import BuyCourseButton from "@/components/BuyCourseButton";

type Props = {
  courseId: string;
  title: string;
  monthlyPrice: number;
  currency: string;
};

export default function SubscriptionCheckout({
  courseId,
  title,
  monthlyPrice,
  currency,
}: Props) {
  const [
    months,
    setMonths,
  ] = useState<1 | 3>(1);

  const [
    autoRenew,
    setAutoRenew,
  ] = useState(false);

  const total = Number(
    (
      monthlyPrice *
      months
    ).toFixed(2)
  );

  return (
    <div
      className="max-w-2xl mx-auto space-y-6"
      dir="rtl"
    >
      <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-7">
        <h1 className="text-2xl font-bold text-slate-900">
          الاشتراك في الدورة
        </h1>

        <p className="text-slate-500 mt-2">
          {title}
        </p>
      </div>

      <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-7">
        <h2 className="font-bold text-lg text-slate-800 mb-5">
          اختر مدة الاشتراك
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() =>
              setMonths(1)
            }
            className={`rounded-2xl border p-5 text-right transition ${
              months === 1
                ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="font-bold text-lg">
              شهر واحد
            </p>

            <p className="mt-2 text-[#124b8a] font-bold text-xl">
              {monthlyPrice.toFixed(2)}{" "}
              {currency}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setMonths(3)
            }
            className={`rounded-2xl border p-5 text-right transition ${
              months === 3
                ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="font-bold text-lg">
              3 أشهر
            </p>

            <p className="mt-2 text-[#124b8a] font-bold text-xl">
              {(
                monthlyPrice * 3
              ).toFixed(2)}{" "}
              {currency}
            </p>
          </button>
        </div>

        <label className="mt-6 flex items-start gap-3 cursor-pointer bg-slate-50 rounded-2xl p-4">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(event) =>
              setAutoRenew(
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4"
          />

          <span>
            <span className="block font-bold text-slate-800">
              التجديد التلقائي
            </span>

            <span className="block text-sm text-slate-500 mt-1 leading-6">
              عند تفعيله، تطلب المنصة من بوابة الدفع إنشاء رمز آمن للبطاقة ليتم استخدامه في التجديد القادم. بيانات البطاقة نفسها لا يتم تخزينها في منصتنا.
            </span>
          </span>
        </label>
      </div>

      <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-7">
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-bold text-slate-700">
            الإجمالي
          </span>

          <span className="text-2xl font-bold text-[#124b8a]">
            {total.toFixed(2)}{" "}
            {currency}
          </span>
        </div>

        <BuyCourseButton
          courseId={courseId}
          subscriptionMonths={months}
          autoRenew={autoRenew}
          label={`دفع ${total.toFixed(
            2
          )} ${currency}`}
        />

        <p className="text-xs text-slate-400 text-center mt-4">
          لن يتم تفعيل الاشتراك إلا بعد تأكيد نجاح الدفع من بوابة الدفع.
        </p>
      </div>
    </div>
  );
}
