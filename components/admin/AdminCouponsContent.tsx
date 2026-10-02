"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { createCoupon } from "@/app/actions/admin-coupons";
import CopyCouponButton from "@/components/admin/CopyCouponButton";
import { formatDate } from "@/lib/format-date";

type Coupon = {
  id: string;
  code: string;
  is_active: boolean;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;

  course: { title: string } | { title: string }[] | null;

  user:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
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

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function AdminCouponsContent({
  coupons,
  courses,
}: Props) {
  const router = useRouter();
  const { language } = useLanguage();

  const isArabic = language === "ar";

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  const [showForm, setShowForm] = useState(false);

  const generateCode = () => {
    return (
      "YW-FREE-" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()
    );
  };

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between gap-4 rounded-[28px] bg-gradient-to-l from-[var(--hero-start)] to-[var(--hero-end)] p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">
            {isArabic ? "إدارة الكوبونات" : "Manage Coupons"}
          </h1>

          <p className="mt-2 text-white/70">
            {isArabic
              ? "إنشاء وإدارة الكوبونات المجانية للدورات"
              : "Create and manage free course coupons"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="shrink-0 rounded-xl bg-[var(--brand-bg)] px-5 py-3 font-bold text-[var(--brand-ink)] transition hover:opacity-90"
        >
          + {isArabic ? "كوبون جديد" : "New Coupon"}
        </button>
      </div>

      {showForm && (
        <form
          action={createCoupon}
          className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 text-[var(--brand-text)]"
        >
          <h2 className="mb-4 text-lg font-bold">
            {isArabic ? "إنشاء كوبون" : "Create Coupon"}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-2">
              <input
                id="coupon-code"
                name="code"
                placeholder={
                  isArabic ? "كود الكوبون" : "Coupon Code"
                }
                className="flex-1 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3 text-[var(--brand-text)] outline-none focus:border-[var(--brand-ink)]"
              />

              <button
                type="button"
                onClick={() => {
                  const input =
                    document.getElementById("coupon-code");

                  if (input instanceof HTMLInputElement) {
                    input.value = generateCode();
                  }
                }}
                className="rounded-xl bg-[var(--brand-ink-soft)] px-4 font-bold text-[var(--brand-ink)] transition hover:opacity-80"
              >
                {isArabic ? "توليد" : "Generate"}
              </button>
            </div>

            <select
              name="course_id"
              defaultValue=""
              className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-3 text-[var(--brand-text)] outline-none focus:border-[var(--brand-ink)]"
              required
            >
              <option value="">
                {isArabic ? "اختر الدورة" : "Select Course"}
              </option>

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="mt-4 rounded-xl bg-[var(--brand-ink)] px-6 py-3 font-bold text-[var(--brand-bg)] transition hover:bg-[var(--brand-ink-hover)]"
          >
            {isArabic ? "حفظ" : "Create"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text)]">
        {coupons.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--brand-bg)] text-sm text-[var(--brand-text-muted)]">
              <tr>
                <th className="p-4 text-start font-semibold">
                  {isArabic ? "الكود" : "Code"}
                </th>

                <th className="p-4 text-start font-semibold">
                  {isArabic ? "الدورة" : "Course"}
                </th>

                <th className="p-4 text-start font-semibold">
                  {isArabic ? "الحالة" : "Status"}
                </th>

                <th className="p-4 text-start font-semibold">
                  {isArabic ? "مستخدم" : "Used"}
                </th>

                <th className="p-4 text-start font-semibold">
                  {isArabic ? "تاريخ الإنشاء" : "Created"}
                </th>

                <th className="w-12 p-4" aria-hidden="true"></th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((coupon) => {
                const courseTitle =
                  firstOf(coupon.course)?.title ?? "-";

                return (
                  <tr
                    key={coupon.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/admin/coupons/${coupon.id}`
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        router.push(
                          `/admin/coupons/${coupon.id}`
                        );
                      }
                    }}
                    className="group cursor-pointer border-t border-[var(--brand-border-soft)] transition-colors hover:bg-[var(--brand-ink-soft)] focus:bg-[var(--brand-ink-soft)] focus:outline-none"
                  >
                    <td className="p-4 font-bold">
                      <div
                        className="flex items-center gap-2"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <span>{coupon.code}</span>
                        <CopyCouponButton
                          code={coupon.code}
                        />
                      </div>
                    </td>

                    <td className="p-4">
                      {courseTitle}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          coupon.is_active
                            ? "rounded-lg bg-[var(--brand-success-bg)] px-3 py-1 text-sm font-bold text-[var(--brand-success)]"
                            : "rounded-lg bg-[var(--brand-danger-bg)] px-3 py-1 text-sm font-bold text-[var(--brand-danger)]"
                        }
                      >
                        {coupon.is_active
                          ? isArabic
                            ? "فعّال"
                            : "Active"
                          : isArabic
                            ? "معطّل"
                            : "Disabled"}
                      </span>
                    </td>

                    <td className="p-4">
                      {coupon.is_used
                        ? isArabic
                          ? "نعم"
                          : "Yes"
                        : isArabic
                          ? "لا"
                          : "No"}
                    </td>

                    <td className="p-4 text-sm text-[var(--brand-text-muted)]">
                      {formatDate(coupon.created_at, isArabic)}
                    </td>

                    <td className="w-12 p-4 text-[var(--brand-text-faint)] transition-colors group-hover:text-[var(--brand-ink)]">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 rtl:rotate-180"
                        aria-hidden="true"
                      >
                        <path d="M7 4l6 6-6 6" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
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
