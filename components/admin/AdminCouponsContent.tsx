"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import {
  createCoupon,
  toggleCoupon,
} from "@/app/actions/admin-coupons";
import CopyCouponButton from "@/components/admin/CopyCouponButton";

type Coupon = {
  id: string;
  code: string;
  is_active: boolean;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;

  course: {
    title: string;
  }[] | null;

  user: {
    full_name: string | null;
    username: string | null;
  }[] | null;
};

type Course = {
  id: string;
  title: string;
};

type Props = {
  coupons: Coupon[];
  courses: Course[];
};

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
      <div className="flex items-center justify-between rounded-[28px] bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">
            {isArabic ? "إدارة الكوبونات" : "Manage Coupons"}
          </h1>

          <p className="mt-2 text-blue-100">
            {isArabic
              ? "إنشاء وإدارة الكوبونات المجانية للدورات"
              : "Create and manage free course coupons"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-xl bg-white px-5 py-3 font-bold text-[#124b8a]"
        >
          + {isArabic ? "كوبون جديد" : "New Coupon"}
        </button>
      </div>

      {showForm && (
        <form
          action={createCoupon}
          className="rounded-2xl border bg-white p-6"
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
                className="flex-1 rounded-xl border px-4 py-3"
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
                className="rounded-xl bg-slate-100 px-4 font-bold"
              >
                {isArabic ? "توليد" : "Generate"}
              </button>
            </div>

            <select
              name="course_id"
              defaultValue=""
              className="rounded-xl border px-4 py-3"
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
            className="mt-4 rounded-xl bg-[#124b8a] px-6 py-3 font-bold text-white"
          >
            {isArabic ? "حفظ" : "Create"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white">
        {coupons.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-start">
                  {isArabic ? "الكود" : "Code"}
                </th>

                <th className="p-4 text-start">
                  {isArabic ? "الدورة" : "Course"}
                </th>

                <th className="p-4 text-start">
                  {isArabic ? "الحالة" : "Status"}
                </th>

                <th className="p-4 text-start">
                  {isArabic ? "مستخدم" : "Used"}
                </th>

                <th className="p-4 text-start">
                  {isArabic ? "تاريخ الإنشاء" : "Created"}
                </th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((coupon) => {
                const courseTitle =
                  coupon.course?.[0]?.title ?? "-";

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
                    className="cursor-pointer border-t transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
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
                      <form
                        action={async () => {
                          await toggleCoupon(
                            coupon.id,
                            coupon.is_active
                          );
                        }}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          type="submit"
                          className={
                            coupon.is_active
                              ? "rounded-lg bg-red-50 px-3 py-1 text-sm font-bold text-red-700"
                              : "rounded-lg bg-green-50 px-3 py-1 text-sm font-bold text-green-700"
                          }
                        >
                          {coupon.is_active
                            ? isArabic
                              ? "تعطيل"
                              : "Disable"
                            : isArabic
                              ? "تفعيل"
                              : "Enable"}
                        </button>
                      </form>
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

                    <td className="p-4 text-sm text-slate-500">
                      {new Date(
                        coupon.created_at
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-slate-500">
            {isArabic
              ? "لا توجد كوبونات حالياً."
              : "No coupons yet."}
          </div>
        )}
      </div>
    </div>
  );
}
