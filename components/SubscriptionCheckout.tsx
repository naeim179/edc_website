"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  validateCoupon,
} from "@/app/actions/coupons";

import BuyCourseButton from "@/components/BuyCourseButton";
import { useLanguage } from "@/components/LanguageProvider";

type BookingSlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  courseId: string;
  title: string;
  monthlyPriceUsd: number;

  courseType:
    | "group"
    | "private";

  isRenewal: boolean;
  registrationOpen: boolean;

  groupDayOfWeek?:
    | number
    | null;

  groupStartTime?:
    | string
    | null;

  groupEndTime?:
    | string
    | null;

  privateBookingId?:
    | string
    | null;

  privateHoldExpiresAt?:
    | string
    | null;

  bookingSlots?: BookingSlot[];
};

const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function formatTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const [
    hourText,
    minute = "00",
  ] = value
    .slice(0, 5)
    .split(":");

  const hour =
    Number(hourText);

  const suffix =
    hour >= 12
      ? "م"
      : "ص";

  return `${
    hour % 12 || 12
  }:${minute} ${suffix}`;
}

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
    >
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2.5"
      />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export default function SubscriptionCheckout({
  courseId,
  title,
  monthlyPriceUsd,
  courseType,
  isRenewal,
  groupDayOfWeek,
  groupStartTime,
  groupEndTime,
  privateBookingId = null,
  privateHoldExpiresAt = null,
  bookingSlots = [],
}: Props) {
  const {
    language,
  } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    months,
    setMonths,
  ] =
    useState<1 | 3>(1);

  const [
    autoRenew,
    setAutoRenew,
  ] =
    useState(false);

  const [
    couponCode,
    setCouponCode,
  ] =
    useState("");

  const [
    couponValid,
    setCouponValid,
  ] =
    useState(false);

  const [
    couponMessage,
    setCouponMessage,
  ] =
    useState("");

  const [
    couponType,
    setCouponType,
  ] =
    useState<
      | "free_subscription"
      | "discount"
      | null
    >(null);

  const [
    couponFinalAmount,
    setCouponFinalAmount,
  ] =
    useState<
      number | null
    >(null);

  const [
    couponMonths,
    setCouponMonths,
  ] =
    useState<
      number | null
    >(null);

  const [
    checkingCoupon,
    setCheckingCoupon,
  ] =
    useState(false);

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<
      "paytabs" |
      "cliq"
    >("paytabs");

  const [
    secondsLeft,
    setSecondsLeft,
  ] =
    useState<number | null>(
      null
    );

  useEffect(() => {
    if (
      !privateHoldExpiresAt ||
      isRenewal
    ) {
      return;
    }

    function update() {
      const remaining =
        Math.max(
          0,
          Math.floor(
            (
              new Date(
                privateHoldExpiresAt!
              ).getTime() -
              Date.now()
            ) /
              1000
          )
        );

      setSecondsLeft(
        remaining
      );
    }

    update();

    const timer =
      window.setInterval(
        update,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    privateHoldExpiresAt,
    isRenewal,
  ]);

  const totalUsd =
    Number(
      (
        monthlyPriceUsd *
        months
      ).toFixed(2)
    );

  const isFreeCoupon =
    couponValid &&
    couponType ===
      "free_subscription";

  const isDiscountCoupon =
    couponValid &&
    couponType ===
      "discount";

  const payableTotalUsd =
    isDiscountCoupon &&
    couponFinalAmount !==
      null
      ? couponFinalAmount
      : totalUsd;

  const privateNewBooking =
    courseType ===
      "private" &&
    !isRenewal;

  const holdExpired =
    privateNewBooking &&
    secondsLeft !== null &&
    secondsLeft <= 0;

  const countdown =
    useMemo(() => {
      if (
        secondsLeft ===
        null
      ) {
        return null;
      }

      const minutes =
        Math.floor(
          secondsLeft / 60
        );

      const seconds =
        secondsLeft % 60;

      return `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        seconds
      ).padStart(
        2,
        "0"
      )}`;
    }, [
      secondsLeft,
    ]);

  const plans: {
    value: 1 | 3;
    label: string;
    totalLabel: string;
  }[] = [
    {
      value: 1,
      label: "شهر واحد",
      totalLabel:
        `${monthlyPriceUsd.toFixed(
          2
        )} USD`,
    },
    {
      value: 3,
      label: "3 أشهر",
      totalLabel:
        `${(
          monthlyPriceUsd *
          3
        ).toFixed(
          2
        )} USD`,
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-5xl"
    >
      <Link
        href={`/courses/${courseId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6155] transition hover:text-[#1B4B43]"
      >
        <ArrowBackIcon />
        العودة إلى الدورة
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px] lg:items-start">
        <section className="rounded-[26px] border border-[#E8E1D4] bg-white p-5 sm:p-7">
          <div className="border-b border-[#F0EBE1] pb-6">
            <p className="text-xs font-bold text-[#C9704A]">
              {courseType ===
              "private"
                ? "PRIVATE 1-TO-1"
                : "GROUP COURSE"}
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[#2A2420] md:text-3xl">
              {isRenewal
                ? "تجديد الاشتراك"
                : "إكمال التسجيل والدفع"}
            </h1>

            <p className="mt-2 text-sm text-[#A69C8C]">
              {title}
            </p>
          </div>

          {courseType ===
            "group" &&
            groupDayOfWeek !=
              null && (
              <div className="mt-6 rounded-2xl border border-[#E3EAE6] bg-[#FAFCFB] p-5">
                <p className="text-xs font-bold text-[#A06A45]">
                  موعد الدورة
                </p>

                <p className="mt-2 text-lg font-bold text-[#24332E]">
                  {
                    DAYS[
                      groupDayOfWeek
                    ]
                  }
                </p>

                <p className="mt-1 text-sm text-[#66736E]">
                  {formatTime(
                    groupStartTime
                  )}{" "}
                  →{" "}
                  {formatTime(
                    groupEndTime
                  )}
                </p>
              </div>
            )}

          {privateNewBooking && (
            <div className="mt-6 rounded-2xl border border-[#DCE7E2] bg-[#F8FBF9] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#A06A45]">
                    المواعيد المختارة
                  </p>

                  <h2 className="mt-1 font-bold text-[#24332E]">
                    حجز Private 1-to-1
                  </h2>
                </div>

                {countdown && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      holdExpired
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {holdExpired
                      ? "انتهى الحجز"
                      : countdown}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {bookingSlots.map(
                  (
                    slot,
                    index
                  ) => (
                    <div
                      key={`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`}
                      className="rounded-xl border border-[#E3EAE6] bg-white p-4"
                    >
                      <p className="text-xs font-bold text-[#A06A45]">
                        الموعد{" "}
                        {index +
                          1}
                      </p>

                      <p className="mt-1 font-bold text-[#24332E]">
                        {
                          DAYS[
                            slot
                              .day_of_week
                          ]
                        }
                      </p>

                      <p className="mt-1 text-sm text-[#66736E]">
                        {formatTime(
                          slot.start_time
                        )}{" "}
                        →{" "}
                        {formatTime(
                          slot.end_time
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>

              {holdExpired && (
                <Link
                  href={`/courses/${courseId}/schedule`}
                  className="mt-4 inline-flex rounded-xl bg-[#1B4B43] px-4 py-2.5 text-sm font-bold text-white"
                >
                  اختيار المواعيد من جديد
                </Link>
              )}
            </div>
          )}

          <div className="mt-7">
            <h2 className="mb-3 font-bold text-[#2A2420]">
              مدة الاشتراك
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map(
                (plan) => {
                  const active =
                    months ===
                    plan.value;

                  return (
                    <button
                      key={
                        plan.value
                      }
                      type="button"
                      onClick={() => {
                        setMonths(
                          plan.value
                        );

                        setCouponValid(
                          false
                        );

                        setCouponType(
                          null
                        );

                        setCouponFinalAmount(
                          null
                        );

                        setCouponMonths(
                          null
                        );

                        setCouponMessage(
                          ""
                        );
                      }}
                      className={`rounded-2xl border p-5 text-right transition ${
                        active
                          ? "border-[#1B4B43] bg-[#F7F3EC] ring-2 ring-[#1B4B43]/15"
                          : "border-[#E8E1D4] hover:border-[#D9CDB6]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2A2420]">
                          {
                            plan.label
                          }
                        </span>

                        <span
                          className={`h-5 w-5 rounded-full border-2 ${
                            active
                              ? "border-[#1B4B43] bg-[#1B4B43]"
                              : "border-[#D9CDB6]"
                          }`}
                        />
                      </div>

                      <p className="mt-2 text-sm text-[#8A3F2A]">
                        {
                          plan.totalLabel
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E8E1D4] bg-white p-4">
            <label className="mb-2 block font-bold text-[#2A2420]">
              {isArabic
                ? "كوبون خصم أو اشتراك مجاني"
                : "Discount or Free Subscription Coupon"}
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={
                  couponCode
                }
                onChange={(
                  event
                ) => {
                  setCouponCode(
                    event.target
                      .value
                  );

                  setCouponValid(
                    false
                  );

                  setCouponType(
                    null
                  );

                  setCouponFinalAmount(
                    null
                  );

                  setCouponMonths(
                    null
                  );

                  setCouponMessage(
                    ""
                  );
                }}
                placeholder="YW-XXXXXX"
                className="min-w-0 flex-1 rounded-xl border px-4 py-3"
              />

              <button
                type="button"
                disabled={
                  checkingCoupon ||
                  holdExpired
                }
                onClick={
                  async () => {
                    setCheckingCoupon(
                      true
                    );

                    try {
                      const result =
                        await validateCoupon(
                          courseId,
                          couponCode,
                          months
                        );

                      setCouponValid(
                        result.valid
                      );

                      setCouponType(
                        result.couponType
                      );

                      setCouponFinalAmount(
                        result.finalAmount
                      );

                      setCouponMonths(
                        result.subscriptionMonths
                      );

                      setCouponMessage(
                        isArabic
                          ? result.messageAr
                          : result.messageEn
                      );

                      if (
                        result.valid
                      ) {
                        setAutoRenew(
                          false
                        );
                      }
                    } catch {
                      setCouponValid(
                        false
                      );

                      setCouponType(
                        null
                      );

                      setCouponFinalAmount(
                        null
                      );

                      setCouponMonths(
                        null
                      );

                      setCouponMessage(
                        isArabic
                          ? "تعذر التحقق من الكوبون."
                          : "Could not validate the coupon."
                      );
                    } finally {
                      setCheckingCoupon(
                        false
                      );
                    }
                  }
                }
                className="rounded-xl bg-[#1B4B43] px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {checkingCoupon
                  ? "..."
                  : isArabic
                    ? "تحقق"
                    : "Apply"}
              </button>
            </div>

            {couponMessage && (
              <p
                className={`mt-2 text-sm font-bold ${
                  couponValid
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {
                  couponMessage
                }
              </p>
            )}
          </div>

          {!isFreeCoupon &&
            totalUsd > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 font-bold text-[#2A2420]">
                  طريقة الدفع
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        "paytabs"
                      )
                    }
                    className={`rounded-2xl border p-4 text-right ${
                      paymentMethod ===
                      "paytabs"
                        ? "border-[#1B4B43] bg-[#F7F3EC]"
                        : "border-[#E8E1D4]"
                    }`}
                  >
                    <p className="text-xl">
                      💳
                    </p>

                    <p className="mt-2 font-bold">
                      PayTabs
                    </p>

                    <p className="mt-1 text-xs text-[#8C978F]">
                      دفع إلكتروني مباشر
                    </p>
                  </button>

                  {!privateNewBooking && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentMethod(
                          "cliq"
                        )
                      }
                      className={`rounded-2xl border p-4 text-right ${
                        paymentMethod ===
                        "cliq"
                          ? "border-[#1B4B43] bg-[#F7F3EC]"
                          : "border-[#E8E1D4]"
                      }`}
                    >
                      <p className="text-xl">
                        📱
                      </p>

                      <p className="mt-2 font-bold">
                        CliQ
                      </p>

                      <p className="mt-1 text-xs text-[#8C978F]">
                        تحويل يدوي
                      </p>
                    </button>
                  )}
                </div>

                {privateNewBooking && (
                  <p className="mt-3 text-xs leading-6 text-[#8C978F]">
                    حجز الـPrivate يستخدم الدفع الإلكتروني المباشر لضمان عدم حجز نفس الدورة لأكثر من طالب.
                  </p>
                )}
              </div>
            )}

          <label className="mt-6 flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-[#F7F3EC] p-4">
            <span>
              <span className="block font-bold text-[#2A2420]">
                تفعيل التجديد التلقائي
              </span>

              <span className="mt-1 block text-sm text-[#6B6155]">
                يمكنك إيقافه لاحقاً من صفحة الدورة.
              </span>
            </span>

            <input
              type="checkbox"
              checked={
                autoRenew
              }
              disabled={
                couponValid ||
                totalUsd === 0
              }
              onChange={(
                event
              ) =>
                setAutoRenew(
                  event.target
                    .checked
                )
              }
              className="mt-1 h-5 w-5"
            />
          </label>
        </section>

        <aside className="rounded-[26px] border border-[#E8E1D4] bg-white p-5 sm:p-6 lg:sticky lg:top-4">
          <h2 className="text-lg font-bold text-[#2A2420]">
            ملخص الطلب
          </h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">
                الدورة
              </span>

              <span className="max-w-[11rem] text-left font-semibold text-[#2A2420]">
                {title}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">
                النوع
              </span>

              <span className="font-semibold text-[#2A2420]">
                {courseType ===
                "private"
                  ? "Private 1-to-1"
                  : "Group"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#A69C8C]">
                المدة
              </span>

              <span className="font-semibold text-[#2A2420]">
                {months === 1
                  ? "شهر واحد"
                  : "3 أشهر"}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-[#F0EBE1] pt-5">
            <p className="text-sm text-[#A69C8C]">
              الإجمالي المستحق
            </p>

            <p className="mt-1 text-3xl font-bold text-[#2A2420]">
              {isFreeCoupon ||
              totalUsd === 0
                ? "FREE"
                : `${payableTotalUsd.toFixed(
                    2
                  )} USD`}
            </p>
          </div>

          <div className="mt-6">
            <BuyCourseButton
              courseId={
                courseId
              }
              subscriptionMonths={
                months
              }
              autoRenew={
                autoRenew
              }
              paymentMethod={
                paymentMethod
              }
              privateBookingId={
                privateBookingId
              }
              disabled={
                holdExpired
              }
              couponCode={
                couponValid
                  ? couponCode
                  : ""
              }
              label={
                holdExpired
                  ? isArabic
                    ? "انتهت مدة الحجز"
                    : "Booking hold expired"
                  : isFreeCoupon ||
                      totalUsd ===
                        0
                    ? privateNewBooking
                      ? isArabic
                        ? "تأكيد الحجز"
                        : "Confirm Booking"
                      : isArabic
                        ? `تفعيل الاشتراك المجاني${couponMonths ? ` (${couponMonths} شهر)` : ""}`
                        : `Activate Free Subscription${couponMonths ? ` (${couponMonths} month${couponMonths === 1 ? "" : "s"})` : ""}`
                    : isArabic
                      ? `دفع ${payableTotalUsd.toFixed(
                          2
                        )} USD`
                      : `Pay ${payableTotalUsd.toFixed(
                          2
                        )} USD`
              }
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#A69C8C]">
            <LockIcon />
            {isFreeCoupon
              ? isArabic
                ? "سيتم تفعيل الاشتراك مباشرة بدون دفع"
                : "The subscription will be activated immediately without payment"
              : isDiscountCoupon
                ? isArabic
                  ? "تم تطبيق الخصم — أكمل الدفع بالسعر الجديد"
                  : "Discount applied — complete payment with the new total"
                : isArabic
                  ? "عملية آمنة ومحمية"
                  : "Secure checkout"}
          </div>
        </aside>
      </div>
    </div>
  );
}
