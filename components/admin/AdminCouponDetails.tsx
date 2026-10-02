"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

import CopyCouponButton from "@/components/admin/CopyCouponButton";
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

export default function AdminCouponDetails({
  coupon,
  courseTitle,
  usedUser,
}: Props) {
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
        className="inline-flex items-center rounded-xl border bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        {isArabic
          ? "← العودة إلى الكوبونات"
          : "← Back to Coupons"}
      </Link>

      <section className="rounded-[28px] bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] p-8 text-white">
        <h1 className="text-3xl font-bold">
          {isArabic
            ? "تفاصيل الكوبون"
            : "Coupon Details"}
        </h1>

        <p className="mt-2 text-blue-100">
          {isArabic
            ? "عرض وإدارة معلومات هذا الكوبون"
            : "View and manage this coupon"}
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "كود الكوبون" : "Coupon Code"}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold">
                {coupon.code}
              </span>

              <CopyCouponButton code={coupon.code} />
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "الدورة" : "Course"}
            </p>

            <p className="mt-2 font-bold">
              {courseTitle ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "الحالة" : "Status"}
            </p>

            <p
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                coupon.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {coupon.isActive
                ? isArabic
                  ? "فعال"
                  : "Active"
                : isArabic
                  ? "معطل"
                  : "Disabled"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "مستخدم" : "Used"}
            </p>

            <p className="mt-2 font-bold">
              {coupon.isUsed
                ? isArabic
                  ? "نعم"
                  : "Yes"
                : isArabic
                  ? "لا"
                  : "No"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "استخدمه" : "Used By"}
            </p>

            <p className="mt-2 font-bold">
              {usedBy}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "تاريخ الاستخدام" : "Used At"}
            </p>

            <p className="mt-2 font-bold">
              {coupon.usedAt
                ? new Date(
                    coupon.usedAt
                  ).toLocaleString()
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {isArabic ? "تاريخ الإنشاء" : "Created At"}
            </p>

            <p className="mt-2 font-bold">
              {new Date(
                coupon.createdAt
              ).toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border bg-white p-6">
        <form
          action={async () => {
            await toggleCoupon(
              coupon.id,
              coupon.isActive
            );
          }}
        >
          <button
            type="submit"
            className={
              coupon.isActive
                ? "rounded-xl bg-red-50 px-5 py-3 font-bold text-red-700"
                : "rounded-xl bg-green-50 px-5 py-3 font-bold text-green-700"
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
