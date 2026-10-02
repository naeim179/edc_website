"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

import CopyCouponButton from "@/components/admin/CopyCouponButton";
import { formatDateTime } from "@/lib/format-date";
import {
  deleteCoupon,
  toggleCoupon,
} from "@/app/actions/admin-coupons";

type Props = {
  coupon: {
    id: string;
    code: string;
    isActive: boolean;
    isUsed: boolean;
    usedAt: string | null;
    createdAt: string;
  };
  courseTitle: string | null;
  usedUser: {
    username: string | null;
    full_name: string | null;
  } | null;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
  usedUser,
}: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const usedBy =
    usedUser?.username ??
    usedUser?.full_name ??
    "-";

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Link
        href="/admin/coupons"
        className="inline-flex items-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2 font-semibold text-[var(--brand-text)] transition hover:bg-[var(--brand-ink-soft)]"
      >
        {isArabic
          ? "← العودة إلى الكوبونات"
          : "← Back to Coupons"}
      </Link>

      <section className="rounded-[28px] bg-gradient-to-l from-[var(--hero-start)] to-[var(--hero-end)] p-8 text-white">
        <h1 className="text-3xl font-bold">
          {isArabic
            ? "تفاصيل الكوبون"
            : "Coupon Details"}
        </h1>

        <p className="mt-2 text-white/70">
          {isArabic
            ? "عرض وإدارة معلومات هذا الكوبون"
            : "View and manage this coupon"}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label={isArabic ? "كود الكوبون" : "Coupon Code"}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{coupon.code}</span>
              <CopyCouponButton code={coupon.code} />
            </div>
          </Field>

          <Field label={isArabic ? "الدورة" : "Course"}>
            {courseTitle ?? "-"}
          </Field>

          <Field label={isArabic ? "الحالة" : "Status"}>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                coupon.isActive
                  ? "bg-[var(--brand-success-bg)] text-[var(--brand-success)]"
                  : "bg-[var(--brand-danger-bg)] text-[var(--brand-danger)]"
              }`}
            >
              {coupon.isActive
                ? isArabic
                  ? "فعّال"
                  : "Active"
                : isArabic
                  ? "معطّل"
                  : "Disabled"}
            </span>
          </Field>

          <Field label={isArabic ? "مستخدم" : "Used"}>
            {coupon.isUsed
              ? isArabic
                ? "نعم"
                : "Yes"
              : isArabic
                ? "لا"
                : "No"}
          </Field>

          <Field label={isArabic ? "استخدمه" : "Used By"}>
            {usedBy}
          </Field>

          <Field label={isArabic ? "تاريخ الاستخدام" : "Used At"}>
            {coupon.usedAt
              ? formatDateTime(coupon.usedAt, isArabic)
              : "-"}
          </Field>

          <Field label={isArabic ? "تاريخ الإنشاء" : "Created At"}>
            {formatDateTime(coupon.createdAt, isArabic)}
          </Field>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
        {!coupon.isUsed && (
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
                ? "rounded-xl bg-[var(--brand-danger-bg)] px-5 py-3 font-bold text-[var(--brand-danger)] transition hover:opacity-80"
                : "rounded-xl bg-[var(--brand-success-bg)] px-5 py-3 font-bold text-[var(--brand-success)] transition hover:opacity-80"
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
            await deleteCoupon(coupon.id);
          }}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              isArabic
                ? "هل أنت متأكد من حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to delete this coupon? This action cannot be undone."
            );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
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
