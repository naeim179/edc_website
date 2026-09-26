"use client";

import { useState } from "react";
import Link from "next/link";

import BuyCourseButton from "@/components/BuyCourseButton";

type Props = {
  courseId: string;
  title: string;
  monthlyPriceUsd: number;
};

function ArrowBackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M5 12l6-6M5 12l6 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export default function SubscriptionCheckout({
  courseId,
  title,
  monthlyPriceUsd,
}: Props) {
  const [months, setMonths] = useState<1 | 3>(1);
  const [autoRenew, setAutoRenew] = useState(false);

  const totalUsd = Number((monthlyPriceUsd * months).toFixed(2));

  const plans: { value: 1 | 3; label: string; totalLabel: string }[] = [
    {
      value: 1,
      label: "شهر واحد",
      totalLabel: `${monthlyPriceUsd.toFixed(2)} USD / شهر`,
    },
    {
      value: 3,
      label: "3 أشهر",
      totalLabel: `${(monthlyPriceUsd * 3).toFixed(2)} USD إجمالي`,
    },
  ];

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl">
      <Link
        href={`/courses/${courseId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6155] transition hover:text-[#1B4B43]"
      >
        <ArrowBackIcon />
        العودة إلى الدورة
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section className="rounded-2xl border border-[#E8E1D4] bg-white p-6 md:p-8">
          <div className="mb-8 border-b border-[#F0EBE1] pb-6">
            <p className="text-xs font-bold text-[#C9704A]">
              {title}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#2A2420] md:text-3xl">
              اشتراك الدورة
            </h1>

            <p className="mt-2 text-sm text-[#A69C8C]">
              اختر المدة المناسبة لك، وأكمل الدفع بأمان
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-bold text-[#2A2420]">مدة الاشتراك</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => {
                const active = months === plan.value;

                return (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setMonths(plan.value)}
                    className={`rounded-2xl border p-5 text-right transition ${
                      active
                        ? "border-[#1B4B43] bg-[#F7F3EC] ring-2 ring-[#1B4B43]/15"
                        : "border-[#E8E1D4] hover:border-[#D9CDB6]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2A2420]">
                        {plan.label}
                      </span>

                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          active
                            ? "border-[#1B4B43] bg-[#1B4B43]"
                            : "border-[#D9CDB6]"
                        }`}
                      >
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#8A3F2A]">
                      {plan.totalLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#E8E1D4] bg-[#F7F3EC] p-5">
            <div>
              <p className="text-sm text-[#A69C8C]">عملة الدفع</p>

              <p className="mt-1 font-bold text-[#2A2420]">
                دولار أمريكي (USD)
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-[#1B4B43]">
              $
            </span>
          </div>

          <label className="mt-6 flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-[#F7F3EC] p-4">
            <span>
              <span className="block font-bold text-[#2A2420]">
                تفعيل التجديد التلقائي
              </span>

              <span className="mt-1 block text-sm leading-6 text-[#6B6155]">
                سيتم التجديد بنفس العملة التي اخترتها في هذه العملية.
              </span>
            </span>

            <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(event) => setAutoRenew(event.target.checked)}
                className="peer sr-only"
              />

              <span className="absolute inset-0 rounded-full bg-[#D9CDB6] transition-colors peer-checked:bg-[#1B4B43]" />

              <span className="absolute start-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-[-1.25rem] rtl:peer-checked:translate-x-[1.25rem]" />
            </span>
          </label>

          {autoRenew && (
            <div className="mt-3 rounded-xl bg-[#F7F3EC] p-3 text-xs leading-6 text-[#1B4B43]">
              إذا أردت تغيير العملة لاحقًا، أوقف التجديد التلقائي ثم جدّد بالعملة الجديدة.
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-[#E8E1D4] bg-white p-6 lg:sticky lg:top-4">
          <h2 className="text-lg font-bold text-[#2A2420]">ملخص الطلب</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">الدورة</span>
              <span className="max-w-[10rem] truncate font-semibold text-[#2A2420]">
                {title}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">المدة</span>
              <span className="font-semibold text-[#2A2420]">
                {months === 1 ? "شهر واحد" : "3 أشهر"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">السعر الشهري</span>
              <span className="font-semibold text-[#2A2420]">
                {monthlyPriceUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-[#F0EBE1] pt-5">
            <p className="text-sm text-[#A69C8C]">الإجمالي المستحق</p>

            <p className="mt-1 text-3xl font-bold text-[#2A2420]">
              {totalUsd.toFixed(2)}{" "}
              <span className="text-sm font-semibold text-[#A69C8C]">
                USD
              </span>
            </p>
          </div>

          <div className="mt-6">
            <BuyCourseButton
              courseId={courseId}
              subscriptionMonths={months}
              autoRenew={autoRenew}
              label={`دفع ${totalUsd.toFixed(2)} USD`}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#A69C8C]">
            <LockIcon />
            دفع آمن عبر PayTabs
          </div>

          <p className="mt-2 text-center text-xs leading-5 text-[#A69C8C]">
            لن يتم تفعيل أو تمديد الاشتراك إلا بعد تأكيد نجاح الدفع.
          </p>
        </aside>
      </div>
    </div>
  );
}
