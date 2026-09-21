"use client";

import { useState } from "react";

import BuyCourseButton from "@/components/BuyCourseButton";

import {
  convertFromUsd,
  type PaymentCurrency,
} from "@/lib/currency";

type Props = {
  courseId: string;
  title: string;
  monthlyPriceUsd: number;
};

export default function SubscriptionCheckout({
  courseId,
  title,
  monthlyPriceUsd,
}: Props) {
  const [months, setMonths] =
    useState<1 | 3>(1);

  const [currency, setCurrency] =
    useState<PaymentCurrency>("USD");

  const [autoRenew, setAutoRenew] =
    useState(false);

  const totalUsd = Number(
    (monthlyPriceUsd * months).toFixed(2)
  );

  const totalJod = convertFromUsd(
    totalUsd,
    "JOD"
  );

  const paymentAmount =
    currency === "USD"
      ? totalUsd
      : totalJod;

  const currencyFullName =
    currency === "USD"
      ? "دولار أمريكي"
      : "دينار أردني";

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-5xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#124b8a] md:text-3xl">
              اشتراك الدورة
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {title}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              اختر المدة وعملة الدفع فقط
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-bold text-slate-800">
              مدة الاشتراك
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMonths(1)}
                className={`rounded-2xl border p-5 text-right transition ${
                  months === 1
                    ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    شهر واحد
                  </span>

                  <span
                    className={`h-5 w-5 rounded-full border-2 ${
                      months === 1
                        ? "border-blue-600 bg-blue-600 ring-4 ring-blue-100"
                        : "border-slate-300"
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMonths(3)}
                className={`rounded-2xl border p-5 text-right transition ${
                  months === 3
                    ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    3 أشهر
                  </span>

                  <span
                    className={`h-5 w-5 rounded-full border-2 ${
                      months === 3
                        ? "border-blue-600 bg-blue-600 ring-4 ring-blue-100"
                        : "border-slate-300"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          <div className="mt-7">
            <h2 className="mb-3 font-bold text-slate-800">
              عملة الدفع
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`rounded-2xl border p-5 text-right transition ${
                  currency === "USD"
                    ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      USD
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      دولار أمريكي
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-[#124b8a]">
                      العملة الأساسية
                    </span>
                  </div>

                  <span className="text-2xl font-bold text-[#124b8a]">
                    $
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCurrency("JOD")}
                className={`rounded-2xl border p-5 text-right transition ${
                  currency === "JOD"
                    ? "border-[#124b8a] bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      JOD
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      دينار أردني
                    </p>
                  </div>

                  <span className="text-lg font-bold text-[#124b8a]">
                    د.أ
                  </span>
                </div>
              </button>
            </div>
          </div>

          <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) =>
                setAutoRenew(event.target.checked)
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block font-bold text-slate-800">
                تفعيل التجديد التلقائي
              </span>

              <span className="mt-1 block text-sm leading-6 text-slate-500">
                سيتم التجديد بنفس العملة التي اخترتها في هذه العملية.
              </span>
            </span>
          </label>

          {autoRenew && (
            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-6 text-[#124b8a]">
              إذا أردت تغيير العملة لاحقًا، أوقف التجديد التلقائي ثم جدّد بالعملة الجديدة.
            </div>
          )}
        </section>

        <aside className="h-fit rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            ملخص الطلب
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">
                السعر الأساسي
              </span>

              <span className="font-bold">
                {totalUsd.toFixed(2)} USD
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">
                ما يعادله بالدينار
              </span>

              <span className="font-bold">
                {totalJod.toFixed(2)} JOD
              </span>
            </div>

            <hr className="border-slate-100" />

            <div>
              <p className="text-slate-500">
                سيتم الدفع بـ
              </p>

              <p className="mt-2 text-2xl font-bold text-[#124b8a]">
                {paymentAmount.toFixed(2)} {currency}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {currencyFullName}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <BuyCourseButton
              courseId={courseId}
              subscriptionMonths={months}
              paymentCurrency={currency}
              autoRenew={autoRenew}
              label={`دفع ${paymentAmount.toFixed(2)} ${currency}`}
            />
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            لن يتم تفعيل أو تمديد الاشتراك إلا بعد تأكيد نجاح الدفع من PayTabs.
          </p>
        </aside>
      </div>
    </div>
  );
}
