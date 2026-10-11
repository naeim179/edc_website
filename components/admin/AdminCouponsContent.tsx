"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { createCoupon } from "@/app/actions/admin-coupons";
import CopyCouponButton from "@/components/admin/CopyCouponButton";
import { formatDate } from "@/lib/format-date";

type Coupon = {
  id: string;
  code: string;
  coupon_type:
    | "free_subscription"
    | "discount";
  subscription_months:
    number | null;
  discount_type:
    | "percentage"
    | "fixed"
    | null;
  discount_value:
    number | null;
  is_active: boolean;
  valid_from: string;
  valid_until:
    string | null;
  max_uses:
    number | null;
  used_count: number;
  created_at: string;
  course:
    | { title: string }
    | { title: string }[]
    | null;
};

type Course = {
  id: string;
  title: string;
};

type Props = {
  coupons: Coupon[];
  courses: Course[];
};

function firstOf<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(value)
  ) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default function AdminCouponsContent({
  coupons,
  courses,
}: Props) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    showForm,
    setShowForm,
  ] =
    useState(false);

  const [
    couponType,
    setCouponType,
  ] =
    useState<
      | "free_subscription"
      | "discount"
    >(
      "free_subscription"
    );

  const [
    discountType,
    setDiscountType,
  ] =
    useState<
      | "percentage"
      | "fixed"
    >(
      "percentage"
    );

  const [
    unlimitedUses,
    setUnlimitedUses,
  ] =
    useState(false);

  const [
    nowMs,
    setNowMs,
  ] =
    useState<
      number | null
    >(null);

  useEffect(() => {
    setNowMs(
      Date.now()
    );

    const timer =
      window.setInterval(
        () => {
          setNowMs(
            Date.now()
          );

          if (
            !document.hidden
          ) {
            router.refresh();
          }
        },
        5000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    router,
  ]);

  function generateCode() {
    const prefix =
      couponType ===
      "free_subscription"
        ? "YW-FREE-"
        : "YW-SAVE-";

    return (
      prefix +
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()
    );
  }

  function couponBenefit(
    coupon: Coupon
  ) {
    if (
      coupon.coupon_type ===
      "free_subscription"
    ) {
      const months =
        Number(
          coupon.subscription_months ??
            0
        );

      return isArabic
        ? `${months} شهر مجاناً`
        : `${months} month${months === 1 ? "" : "s"} free`;
    }

    if (
      coupon.discount_type ===
      "percentage"
    ) {
      return `${Number(
        coupon.discount_value ??
          0
      )}%`;
    }

    return `${Number(
      coupon.discount_value ??
        0
    ).toFixed(2)} USD`;
  }

  function couponStatus(
    coupon: Coupon
  ) {
    if (
      !coupon.is_active
    ) {
      return {
        label:
          isArabic
            ? "معطّل"
            : "Disabled",
        className:
          "bg-[var(--brand-danger-bg)] text-[var(--brand-danger)]",
      };
    }

    if (
      coupon.max_uses !=
        null &&
      coupon.used_count >=
        coupon.max_uses
    ) {
      return {
        label:
          isArabic
            ? "مكتمل الاستخدام"
            : "Exhausted",
        className:
          "bg-amber-100 text-amber-800",
      };
    }

    if (
      nowMs !== null &&
      new Date(
        coupon.valid_from
      ).getTime() >
        nowMs
    ) {
      return {
        label:
          isArabic
            ? "لم يبدأ"
            : "Scheduled",
        className:
          "bg-blue-100 text-blue-800",
      };
    }

    if (
      nowMs !== null &&
      coupon.valid_until &&
      new Date(
        coupon.valid_until
      ).getTime() <=
        nowMs
    ) {
      return {
        label:
          isArabic
            ? "منتهي"
            : "Expired",
        className:
          "bg-slate-200 text-slate-700",
      };
    }

    return {
      label:
        isArabic
          ? "فعّال"
          : "Active",
      className:
        "bg-[var(--brand-success-bg)] text-[var(--brand-success)]",
    };
  }

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-[28px] bg-gradient-to-l from-[var(--hero-start)] to-[var(--hero-end)] p-5 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <h1 className="text-3xl font-bold">
            {isArabic
              ? "إدارة الكوبونات"
              : "Manage Coupons"}
          </h1>

          <p className="mt-2 text-white/70">
            {isArabic
              ? "اشتراك مجاني بعدد أشهر محدد أو خصم على السعر"
              : "Free subscriptions with custom duration or price discounts"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowForm(
              (
                value
              ) =>
                !value
            )
          }
          className="w-full shrink-0 rounded-xl bg-[var(--brand-bg)] px-5 py-3 text-center font-bold text-[var(--brand-ink)] transition hover:opacity-90 sm:w-auto"
        >
          +{" "}
          {isArabic
            ? "كوبون جديد"
            : "New Coupon"}
        </button>
      </div>

      {showForm && (
        <form
          action={
            createCoupon
          }
          className="rounded-[26px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 text-[var(--brand-text)] sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              {isArabic
                ? "إنشاء كوبون"
                : "Create Coupon"}
            </h2>

            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "كل طالب يستطيع استخدام نفس الكوبون مرة واحدة فقط."
                : "Each student can redeem the same coupon only once."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "نوع الكوبون"
                  : "Coupon Type"}
              </span>

              <select
                name="coupon_type"
                value={
                  couponType
                }
                onChange={(
                  event
                ) =>
                  setCouponType(
                    event.target
                      .value as
                      | "free_subscription"
                      | "discount"
                  )
                }
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
              >
                <option value="free_subscription">
                  {isArabic
                    ? "اشتراك مجاني"
                    : "Free Subscription"}
                </option>

                <option value="discount">
                  {isArabic
                    ? "خصم"
                    : "Discount"}
                </option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "الدورة"
                  : "Course"}
              </span>

              <select
                name="course_id"
                defaultValue=""
                required
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
              >
                <option value="">
                  {isArabic
                    ? "اختر الدورة"
                    : "Select Course"}
                </option>

                {courses.map(
                  (
                    course
                  ) => (
                    <option
                      key={
                        course.id
                      }
                      value={
                        course.id
                      }
                    >
                      {
                        course.title
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "كود الكوبون"
                  : "Coupon Code"}
              </span>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="coupon-code"
                  name="code"
                  required
                  placeholder={
                    couponType ===
                    "free_subscription"
                      ? "YW-FREE-XXXXXX"
                      : "YW-SAVE-XXXXXX"
                  }
                  className="min-w-0 flex-1 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3 uppercase"
                />

                <button
                  type="button"
                  onClick={() => {
                    const input =
                      document.getElementById(
                        "coupon-code"
                      );

                    if (
                      input instanceof
                      HTMLInputElement
                    ) {
                      input.value =
                        generateCode();
                    }
                  }}
                  className="rounded-xl bg-[var(--brand-ink-soft)] px-5 py-3 font-bold text-[var(--brand-ink)]"
                >
                  {isArabic
                    ? "توليد كود"
                    : "Generate"}
                </button>
              </div>
            </label>

            {couponType ===
            "free_subscription" ? (
              <label className="space-y-2">
                <span className="block text-sm font-bold">
                  {isArabic
                    ? "مدة الاشتراك بالأشهر"
                    : "Subscription Months"}
                </span>

                <input
                  type="number"
                  name="subscription_months"
                  min="1"
                  max="60"
                  step="1"
                  defaultValue="1"
                  required
                  className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
                />

                <span className="block text-xs text-[var(--brand-text-muted)]">
                  {isArabic
                    ? "مثال: 1 أو 3 أو 6 أو 12 شهر"
                    : "Example: 1, 3, 6 or 12 months"}
                </span>
              </label>
            ) : (
              <>
                <label className="space-y-2">
                  <span className="block text-sm font-bold">
                    {isArabic
                      ? "نوع الخصم"
                      : "Discount Type"}
                  </span>

                  <select
                    name="discount_type"
                    value={
                      discountType
                    }
                    onChange={(
                      event
                    ) =>
                      setDiscountType(
                        event.target
                          .value as
                          | "percentage"
                          | "fixed"
                      )
                    }
                    className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
                  >
                    <option value="percentage">
                      {isArabic
                        ? "نسبة مئوية %"
                        : "Percentage %"}
                    </option>

                    <option value="fixed">
                      {isArabic
                        ? "مبلغ ثابت USD"
                        : "Fixed Amount USD"}
                    </option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold">
                    {discountType ===
                    "percentage"
                      ? isArabic
                        ? "نسبة الخصم"
                        : "Discount Percentage"
                      : isArabic
                        ? "قيمة الخصم بالدولار"
                        : "Discount Amount (USD)"}
                  </span>

                  <input
                    type="number"
                    name="discount_value"
                    min="0.01"
                    max={
                      discountType ===
                      "percentage"
                        ? "99.99"
                        : undefined
                    }
                    step="0.01"
                    required
                    placeholder={
                      discountType ===
                      "percentage"
                        ? "20"
                        : "10"
                    }
                    className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
                  />
                </label>
              </>
            )}

            <label className="space-y-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "بداية الصلاحية"
                  : "Valid From"}
              </span>

              <input
                type="datetime-local"
                name="valid_from"
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
              />

              <span className="block text-xs text-[var(--brand-text-muted)]">
                {isArabic
                  ? "فارغ = يبدأ فوراً، بتوقيت الأردن"
                  : "Blank = starts immediately, Jordan time"}
              </span>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "انتهاء الصلاحية"
                  : "Valid Until"}
              </span>

              <input
                type="datetime-local"
                name="valid_until"
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3"
              />

              <span className="block text-xs text-[var(--brand-text-muted)]">
                {isArabic
                  ? "اختياري — فارغ = بدون تاريخ انتهاء"
                  : "Optional — blank = no expiry date"}
              </span>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-bold">
                {isArabic
                  ? "الحد الأقصى للاستخدام"
                  : "Maximum Uses"}
              </span>

              <input
                type="number"
                name="max_uses"
                min="1"
                step="1"
                defaultValue="1"
                disabled={
                  unlimitedUses
                }
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3 disabled:opacity-50"
              />
            </label>

            <div className="flex flex-col justify-end gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    unlimitedUses
                  }
                  onChange={(
                    event
                  ) =>
                    setUnlimitedUses(
                      event.target
                        .checked
                    )
                  }
                />

                <span className="font-bold">
                  {isArabic
                    ? "استخدامات غير محدودة"
                    : "Unlimited Uses"}
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                />

                <span className="font-bold">
                  {isArabic
                    ? "تفعيل الكوبون مباشرة"
                    : "Activate Immediately"}
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-xl bg-[var(--brand-ink)] px-7 py-3 font-bold text-[var(--brand-bg)] transition hover:bg-[var(--brand-ink-hover)]"
          >
            {isArabic
              ? "إنشاء الكوبون"
              : "Create Coupon"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text)]">
        {coupons.length >
        0 ? (
          <table className="w-full min-w-[1050px]">
            <thead className="bg-[var(--brand-bg)] text-sm text-[var(--brand-text-muted)]">
              <tr>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "الكود"
                    : "Code"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "النوع"
                    : "Type"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "القيمة"
                    : "Benefit"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "الدورة"
                    : "Course"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "الاستخدام"
                    : "Usage"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "الحالة"
                    : "Status"}
                </th>
                <th className="p-4 text-start font-semibold">
                  {isArabic
                    ? "الإنشاء"
                    : "Created"}
                </th>
                <th
                  className="w-12 p-4"
                  aria-hidden="true"
                />
              </tr>
            </thead>

            <tbody>
              {coupons.map(
                (
                  coupon
                ) => {
                  const courseTitle =
                    firstOf(
                      coupon.course
                    )?.title ??
                    "-";

                  const status =
                    couponStatus(
                      coupon
                    );

                  return (
                    <tr
                      key={
                        coupon.id
                      }
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        router.push(
                          `/admin/coupons/${coupon.id}`
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key ===
                            " "
                        ) {
                          event.preventDefault();

                          router.push(
                            `/admin/coupons/${coupon.id}`
                          );
                        }
                      }}
                      className="group cursor-pointer border-t border-[var(--brand-border-soft)] transition hover:bg-[var(--brand-ink-soft)]"
                    >
                      <td className="p-4 font-bold">
                        <div
                          className="flex items-center gap-2"
                          onClick={(
                            event
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          <span>
                            {
                              coupon.code
                            }
                          </span>

                          <CopyCouponButton
                            code={
                              coupon.code
                            }
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        {coupon.coupon_type ===
                        "free_subscription"
                          ? isArabic
                            ? "اشتراك مجاني"
                            : "Free Subscription"
                          : isArabic
                            ? "خصم"
                            : "Discount"}
                      </td>

                      <td className="p-4 font-bold text-[var(--brand-ink)]">
                        {couponBenefit(
                          coupon
                        )}
                      </td>

                      <td className="p-4">
                        {
                          courseTitle
                        }
                      </td>

                      <td className="p-4">
                        <span className="font-bold">
                          {
                            coupon.used_count
                          }
                        </span>
                        {" / "}
                        {coupon.max_uses ==
                        null
                          ? "∞"
                          : coupon.max_uses}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${status.className}`}
                        >
                          {
                            status.label
                          }
                        </span>
                      </td>

                      <td className="p-4 text-sm text-[var(--brand-text-muted)]">
                        {formatDate(
                          coupon.created_at,
                          isArabic
                        )}
                      </td>

                      <td className="w-12 p-4 text-[var(--brand-text-faint)] group-hover:text-[var(--brand-ink)]">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 rtl:rotate-180"
                        >
                          <path d="M7 4l6 6-6 6" />
                        </svg>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-[var(--brand-text-muted)]">
            {isArabic
              ? "لا توجد كوبونات حالياً."
              : "No coupons yet."}
          </div>
        )}
      </div>
    </div>
  );
}
