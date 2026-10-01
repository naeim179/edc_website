"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createCoupon, toggleCoupon } from "@/app/actions/admin-coupons";
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

  const { language } = useLanguage();

  const isArabic = language === "ar";

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
      className="max-w-7xl mx-auto space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] p-8 text-white flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            {isArabic ? "إدارة الكوبونات" : "Manage Coupons"}
          </h1>

          <p className="mt-2 text-blue-100">
            {isArabic
              ? "إنشاء كوبونات مجانية للدورات"
              : "Create free course coupons"}
          </p>
        </div>


        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-[#124b8a] px-5 py-3 rounded-xl font-bold"
        >
          + {isArabic ? "كوبون جديد" : "New Coupon"}
        </button>

      </div>



      {showForm && (

        <form
          action={createCoupon}
          className="bg-white rounded-2xl border p-6"
        >

          <h2 className="font-bold text-lg mb-4">
            {isArabic ? "إنشاء كوبون" : "Create Coupon"}
          </h2>


          <div className="grid md:grid-cols-2 gap-4">

            <div className="flex gap-2">

              <input
                id="coupon-code"
                name="code"
                placeholder={isArabic ? "كود الكوبون" : "Coupon Code"}
                className="border rounded-xl px-4 py-3 flex-1"
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
                className="bg-slate-100 px-4 rounded-xl font-bold"
              >
                {isArabic ? "توليد" : "Generate"}
              </button>

            </div>


            <select
              name="course_id"
              className="border rounded-xl px-4 py-3"
            >
              <option>
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
            className="mt-4 bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
          >
            {isArabic ? "حفظ" : "Create"}
          </button>

        </form>

      )}




      <div className="bg-white rounded-2xl border overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr>
              <th className="p-4 text-start">
                Code
              </th>

              <th className="p-4 text-start">
                Course
              </th>

              <th className="p-4 text-start">
                Status
              </th>

              <th className="p-4 text-start">
                Used
              </th>

              <th className="p-4 text-start">
                Used By
              </th>

              <th className="p-4 text-start">
                Used At
              </th>

              <th className="p-4 text-start">
                Used By
              </th>
            </tr>

          </thead>


          <tbody>

            {coupons.map((coupon) => (

              <tr
                key={coupon.id}
                className="border-t"
              >

                <td className="p-4 font-bold flex items-center gap-2">
                  {coupon.code}
                  <CopyCouponButton code={coupon.code} />
                </td>


                <td className="p-4">
                  {coupon.course?.[0]?.title ?? "-"}
                </td>


                <td className="p-4">

                  <form
                    action={async () => {
                      await toggleCoupon(
                        coupon.id,
                        coupon.is_active
                      );
                    }}
                  >
                    <button
                      className={
                        coupon.is_active
                          ? "bg-red-50 text-red-700 px-3 py-1 rounded-lg text-sm font-bold"
                          : "bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-bold"
                      }
                    >
                      {coupon.is_active
                        ? (isArabic ? "تعطيل" : "Disable")
                        : (isArabic ? "تفعيل" : "Enable")}
                    </button>
                  </form>

                </td>


                <td className="p-4">
                  {coupon.is_used
                    ? "Yes"
                    : "No"}
                </td>

                <td className="p-4">
                  {coupon.user?.[0]?.username ??
                   coupon.user?.[0]?.full_name ??
                   "-"}
                </td>

                <td className="p-4">
                  {coupon.used_at
                    ? new Date(coupon.used_at).toLocaleDateString()
                    : "-"}
                </td>


                <td className="p-4">
                  {coupon.user?.[0]?.username ??
                   coupon.user?.[0]?.full_name ??
                   "-"}
                </td>


              </tr>

            ))}

          </tbody>

        </table>

      </div>


    </div>
  );
}
