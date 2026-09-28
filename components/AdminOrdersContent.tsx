"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useMemo, useState } from "react";


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

function formatDate(
  dateStr: string,
  isArabic: boolean,
  t: {
    admin: {
      pm: string;
      am: string;
    };
  }
) {
  const d = new Date(dateStr);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  const period = hours >= 12
    ? (isArabic ? t.admin.pm : "PM")
    : (isArabic ? t.admin.am : "AM");

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return isArabic
    ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${period}`
    : `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} ${period}`;
}

export default function AdminOrdersContent({
  orders,
}: Props) {
  const { language, t } = useLanguage();

  const isArabic = language === "ar";

  const [filter, setFilter] =
    useState<"all" | "pending" | "paid" | "failed">("all");

  const [search, setSearch] =
    useState("");

  function getStatusLabel(status: string) {
    if (status === "paid") {
      return t.admin.paid;
    }

    if (status === "failed") {
      return t.admin.failedStatus;
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
          {t.admin.payments}
        </h1>

        <p className="text-slate-500 mt-2">
          {t.admin.paymentsDescription}
        </p>
      </div>

      <div className="bg-[var(--brand-surface)] rounded-2xl border p-5 flex flex-wrap gap-3 justify-between">

        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Search student or course..."
          className="rounded-xl border px-4 py-2"
        />

        <div className="flex gap-2 flex-wrap">
          {[
            ["all","All"],
            ["pending","Pending"],
            ["paid","Paid"],
            ["failed","Failed"],
          ].map(([key,label])=>(
            <button
              key={key}
              onClick={() =>
                setFilter(
                  key as "all" | "pending" | "paid" | "failed"
                )
              }
              className={
                `rounded-xl px-4 py-2 font-bold border ${
                  filter===key
                  ? "bg-[#1B4B43] text-white"
                  : "bg-white"
                }`
              }
            >
              {label}
            </button>
          ))}
        </div>

      </div>

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders
          .filter((order) => {
            const matches =
              filter === "all" ||
              order.status === filter;

            const text =
              `${order.studentName ?? ""} ${order.courses?.[0]?.title ?? ""}`
              .toLowerCase();

            return (
              matches &&
              text.includes(search.toLowerCase())
            );
          })
          .map((order) => {
            const courseTitle =
              order.courses?.[0]?.title ??
              (t.admin.courseNotFound);

            return (
              <div
                key={order.id}
                className="bg-[var(--brand-surface)] rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-800">
                      {courseTitle}
                    </h2>

                    <p className="text-sm text-slate-500 mt-2">
                      {t.admin.student}
                      :{" "}
                      {order.studentName ??
                        "Unknown"}
                    </p>

                    <p className="text-sm text-slate-500 mt-2">
                      {t.admin.amount}
                      :{" "}
                      {order.amount}{" "}
                      {order.currency}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(order.created_at, isArabic, t)}
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
            {t.admin.noPaymentResults}
          </div>
        )}
      </div>
    </div>
  );
}
