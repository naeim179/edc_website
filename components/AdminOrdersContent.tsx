"use client";

import { useLanguage } from "@/components/LanguageProvider";

type Order = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_id: string;
  created_at: string;
  student?: string;
  studentName?: string;
  courses: {
    title?: string;
  }[];
};

type Props = {
  orders: Order[];
};

function formatDate(dateStr: string, isArabic: boolean) {
  const d = new Date(dateStr);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  const period = hours >= 12
    ? (isArabic ? "م" : "PM")
    : (isArabic ? "ص" : "AM");

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return isArabic
    ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${period}`
    : `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} ${period}`;
}

export default function AdminOrdersContent({
  orders,
}: Props) {
  const { language } = useLanguage();

  const isArabic = language === "ar";

  function getStatusLabel(status: string) {
    if (status === "paid") {
      return isArabic
        ? "تم الدفع بنجاح"
        : "Paid";
    }

    if (status === "failed") {
      return isArabic
        ? "فشل الدفع"
        : "Failed";
    }

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "paid") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (status === "failed") {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-slate-50 text-slate-700 border-slate-200";
  }

  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="bg-white rounded-2xl border p-6 text-right">
        <h1 className="text-2xl font-bold">
          {isArabic
            ? "عمليات الدفع"
            : "Payments"}
        </h1>

        <p className="text-slate-500 mt-2">
          {isArabic
            ? "تظهر هنا فقط نتائج الدفع الناجحة أو الفاشلة. لا تحتاج أي عملية إلى موافقة يدوية."
            : "Only successful or failed payment results appear here. No manual approval is required."}
        </p>
      </div>

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => {
            const courseTitle =
              order.courses?.[0]?.title ??
              (isArabic
                ? "دورة غير موجودة"
                : "Course not found");

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border p-5 text-right"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-800">
                      {courseTitle}
                    </h2>

                    <p className="text-sm text-slate-500 mt-2">
                      {isArabic
                        ? "الطالب"
                        : "Student"}
                      :{" "}
                      {order.studentName ??
                        "Unknown"}
                    </p>

                    <p className="text-sm text-slate-500 mt-2">
                      {isArabic
                        ? "المبلغ"
                        : "Amount"}
                      :{" "}
                      {order.amount}{" "}
                      {order.currency}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(order.created_at, isArabic)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex border rounded-full px-3 py-1 text-sm font-bold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(
                      order.status
                    )}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border rounded-xl p-6 text-right text-slate-500">
            {isArabic
              ? "لا توجد نتائج دفع حتى الآن"
              : "No payment results yet"}
          </div>
        )}
      </div>
    </div>
  );
}
