"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import CopyCouponButton from "@/components/admin/CopyCouponButton";
import { formatDateTime } from "@/lib/format-date";
import {
  deleteCoupon,
  toggleCoupon,
} from "@/app/actions/admin-coupons";

type Redemption = {
  id: string;
  status:
    | "reserved"
    | "redeemed"
    | "released";
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt:
    string | null;
  reservationExpiresAt:
    string | null;
  createdAt: string;
  userName: string;
};

type Props = {
  coupon: {
    id: string;
    code: string;
    couponType:
      | "free_subscription"
      | "discount";
    subscriptionMonths:
      number | null;
    discountType:
      | "percentage"
      | "fixed"
      | null;
    discountValue:
      number | null;
    isActive: boolean;
    validFrom: string;
    validUntil:
      string | null;
    maxUses:
      number | null;
    usedCount: number;
    createdAt: string;
  };
  courseTitle:
    string | null;
  redemptions:
    Redemption[];
};

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-[var(--brand-text-muted)]">
        {label}
      </p>

      <div className="mt-2 font-bold text-[var(--brand-text)]">
        {children}
      </div>
    </div>
  );
}

export default function AdminCouponDetails({
  coupon,
  courseTitle,
  redemptions,
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
  }, []);

  const exhausted =
    coupon.maxUses !=
      null &&
    coupon.usedCount >=
      coupon.maxUses;

  const expired =
    nowMs !== null &&
    coupon.validUntil !=
      null &&
    new Date(
      coupon.validUntil
    ).getTime() <=
      nowMs;

  const scheduled =
    nowMs !== null &&
    new Date(
      coupon.validFrom
    ).getTime() >
      nowMs;

  const status =
    !coupon.isActive
      ? isArabic
        ? "معطّل"
        : "Disabled"
      : exhausted
        ? isArabic
          ? "مكتمل الاستخدام"
          : "Exhausted"
        : expired
          ? isArabic
            ? "منتهي"
            : "Expired"
          : scheduled
            ? isArabic
              ? "لم يبدأ"
              : "Scheduled"
            : isArabic
              ? "فعّال"
              : "Active";

  const benefit =
    coupon.couponType ===
    "free_subscription"
      ? isArabic
        ? `${coupon.subscriptionMonths} شهر اشتراك مجاني`
        : `${coupon.subscriptionMonths} month${coupon.subscriptionMonths === 1 ? "" : "s"} free subscription`
      : coupon.discountType ===
          "percentage"
        ? `${coupon.discountValue}%`
        : `${Number(
            coupon.discountValue ??
              0
          ).toFixed(2)} USD`;

  function redemptionStatus(
    value:
      Redemption["status"]
  ) {
    if (
      value ===
      "redeemed"
    ) {
      return isArabic
        ? "تم الاستخدام"
        : "Redeemed";
    }

    if (
      value ===
      "reserved"
    ) {
      return isArabic
        ? "محجوز للدفع"
        : "Reserved";
    }

    return isArabic
      ? "تم التحرير"
      : "Released";
  }

  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <Link
        href="/admin/coupons"
        className="inline-flex rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2 font-semibold text-[var(--brand-text)]"
      >
        {isArabic
          ? "← العودة إلى الكوبونات"
          : "← Back to Coupons"}
      </Link>

      <section className="rounded-[28px] bg-gradient-to-l from-[var(--hero-start)] to-[var(--hero-end)] p-6 text-white sm:p-8">
        <h1 className="text-3xl font-bold">
          {isArabic
            ? "تفاصيل الكوبون"
            : "Coupon Details"}
        </h1>

        <p className="mt-2 text-white/70">
          {isArabic
            ? "إعدادات الكوبون وسجل استخدامه"
            : "Coupon settings and redemption history"}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label={
              isArabic
                ? "كود الكوبون"
                : "Coupon Code"
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">
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
          </Field>

          <Field
            label={
              isArabic
                ? "الدورة"
                : "Course"
            }
          >
            {courseTitle ??
              "-"}
          </Field>

          <Field
            label={
              isArabic
                ? "نوع الكوبون"
                : "Coupon Type"
            }
          >
            {coupon.couponType ===
            "free_subscription"
              ? isArabic
                ? "اشتراك مجاني"
                : "Free Subscription"
              : isArabic
                ? "خصم"
                : "Discount"}
          </Field>

          <Field
            label={
              isArabic
                ? "القيمة"
                : "Benefit"
            }
          >
            {
              benefit
            }
          </Field>

          <Field
            label={
              isArabic
                ? "الحالة"
                : "Status"
            }
          >
            {
              status
            }
          </Field>

          <Field
            label={
              isArabic
                ? "الاستخدام"
                : "Usage"
            }
          >
            {
              coupon.usedCount
            }
            {" / "}
            {coupon.maxUses ==
            null
              ? isArabic
                ? "غير محدود"
                : "Unlimited"
              : coupon.maxUses}
          </Field>

          <Field
            label={
              isArabic
                ? "بداية الصلاحية"
                : "Valid From"
            }
          >
            {formatDateTime(
              coupon.validFrom,
              isArabic
            )}
          </Field>

          <Field
            label={
              isArabic
                ? "نهاية الصلاحية"
                : "Valid Until"
            }
          >
            {coupon.validUntil
              ? formatDateTime(
                  coupon.validUntil,
                  isArabic
                )
              : isArabic
                ? "بدون تاريخ انتهاء"
                : "No expiry date"}
          </Field>

          <Field
            label={
              isArabic
                ? "تاريخ الإنشاء"
                : "Created At"
            }
          >
            {formatDateTime(
              coupon.createdAt,
              isArabic
            )}
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">
              {isArabic
                ? "سجل الاستخدام"
                : "Redemption History"}
            </h2>

            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "يشمل الاستخدامات المكتملة والحجوزات المؤقتة والمحاولات المحررة."
                : "Includes completed redemptions, temporary reservations and released attempts."}
            </p>
          </div>

          <span className="rounded-full bg-[var(--brand-bg)] px-4 py-2 text-sm font-bold">
            {
              redemptions.length
            }
          </span>
        </div>

        {redemptions.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--brand-border)] p-8 text-center text-[var(--brand-text-muted)]">
            {isArabic
              ? "لم يستخدم أحد هذا الكوبون بعد."
              : "No coupon activity yet."}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {redemptions.map(
              (
                redemption
              ) => (
                <div
                  key={
                    redemption.id
                  }
                  className="grid gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4 md:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-bold text-[var(--brand-text)]">
                      {
                        redemption.userName
                      }
                    </p>

                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {formatDateTime(
                        redemption.redeemedAt ??
                          redemption.createdAt,
                        isArabic
                      )}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        redemption.status ===
                        "redeemed"
                          ? "bg-emerald-100 text-emerald-800"
                          : redemption.status ===
                              "reserved"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {redemptionStatus(
                        redemption.status
                      )}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-[var(--brand-text)]">
                    {coupon.couponType ===
                    "discount"
                      ? `-${redemption.discountAmount.toFixed(2)} USD`
                      : isArabic
                        ? `${coupon.subscriptionMonths} شهر`
                        : `${coupon.subscriptionMonths} month${coupon.subscriptionMonths === 1 ? "" : "s"}`}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 sm:p-6">
        {!exhausted &&
          !expired && (
            <form
              action={async () => {
                await toggleCoupon(
                  coupon.id,
                  coupon.isActive
                );

                router.refresh();
              }}
            >
              <button
                type="submit"
                className={
                  coupon.isActive
                    ? "rounded-xl bg-[var(--brand-danger-bg)] px-5 py-3 font-bold text-[var(--brand-danger)]"
                    : "rounded-xl bg-[var(--brand-success-bg)] px-5 py-3 font-bold text-[var(--brand-success)]"
                }
              >
                {coupon.isActive
                  ? isArabic
                    ? "تعطيل الكوبون"
                    : "Disable Coupon"
                  : isArabic
                    ? "تفعيل الكوبون"
                    : "Enable Coupon"}
              </button>
            </form>
          )}

        <form
          action={async () => {
            await deleteCoupon(
              coupon.id
            );
          }}
          onSubmit={(
            event
          ) => {
            const confirmed =
              window.confirm(
                isArabic
                  ? "هل أنت متأكد من حذف هذا الكوبون وسجل استخدامه؟"
                  : "Delete this coupon and its redemption history?"
              );

            if (
              !confirmed
            ) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
          >
            {isArabic
              ? "حذف الكوبون"
              : "Delete Coupon"}
          </button>
        </form>
      </section>
    </div>
  );
}
