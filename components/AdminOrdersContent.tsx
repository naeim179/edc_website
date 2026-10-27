"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/admin-orders";


type Order = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_id: string;
  created_at: string;
  payment_method?: string | null;
  payment_proof?: string | null;
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
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [review, setReview] = useState<{
    id: string;
    decision: "paid" | "failed";
  } | null>(null);

  function reviewCliq(id: string, decision: "paid" | "failed") {
    if (busy) return;
    setFeedback("");
    setReview({ id, decision });
  }

  async function confirmReview() {
    if (!review || busy) return;

    const { id, decision } = review;
    setBusy(id);
    setFeedback("");

    try {
      await updateOrderStatus(id, decision);
      setReview(null);
      setFeedback(
        decision === "paid"
          ? (isArabic ? "تم تأكيد الدفع بنجاح." : "Payment confirmed successfully.")
          : (isArabic ? "تم رفض إثبات CliQ." : "CliQ proof rejected.")
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        (isArabic ? "تعذّر تنفيذ العملية. " : "Action failed. ") +
        (error instanceof Error ? error.message : "")
      );
    } finally {
      setBusy(null);
    }
  }

  const [filter, setFilter] =
    useState<"all" | "pending" | "paid" | "failed">("all");

  const [search, setSearch] =
    useState("");

  function getStatusLabel(status: string) {
    if (status === "pending") {
      return isArabic ? "قيد الانتظار" : "Pending";
    }
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
      {review && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliq-dialog-title"
            aria-describedby="cliq-dialog-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setReview(null);
            }}
            className="w-full max-w-md rounded-3xl border border-[#E8E1D4] bg-white p-6 text-start shadow-2xl sm:p-8"
          >
            <h2
              id="cliq-dialog-title"
              className="text-xl font-bold text-[#1B4B43]"
            >
              {review.decision === "paid"
                ? (isArabic ? "تأكيد دفع CliQ" : "Confirm CliQ payment")
                : (isArabic ? "رفض إثبات CliQ" : "Reject CliQ proof")}
            </h2>

            <p
              id="cliq-dialog-description"
              className="mt-4 leading-7 text-slate-600"
            >
              {review.decision === "paid"
                ? (isArabic
                    ? "هل تحققت من وصول التحويل الفعلي إلى حسابك البنكي؟ التأكيد سيؤدي إلى تفعيل اشتراك الطالب."
                    : "Have you verified the actual bank transfer? Confirming will activate the student's subscription.")
                : (isArabic
                    ? "هل تريد رفض هذا الإثبات؟ لن يتم تفعيل الاشتراك."
                    : "Reject this payment proof? The subscription will not be activated.")}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={Boolean(busy)}
                onClick={() => setReview(null)}
                className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 disabled:opacity-50"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void confirmReview()}
                className={`rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                  review.decision === "paid"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {busy
                  ? (isArabic ? "جارٍ التنفيذ..." : "Processing...")
                  : review.decision === "paid"
                    ? (isArabic ? "تأكيد الدفع" : "Confirm payment")
                    : (isArabic ? "رفض الإثبات" : "Reject proof")}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="bg-white rounded-2xl border p-6 text-right">
        <h1 className="text-2xl font-bold">
          {t.admin.payments}
        </h1>

        <p className="text-slate-500 mt-2">
          {isArabic
            ? "تابع حالة المدفوعات وراجع إثباتات CliQ يدويًا قبل تفعيل الاشتراك."
            : "Track payments and manually review CliQ proofs before activating subscriptions."}
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-4 right-4 top-5 z-[110] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#D8E5DF] bg-white p-4 text-sm font-semibold text-[#1B4B43] shadow-xl"
        >
          <span className="flex-1">{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback("")}
            aria-label={isArabic ? "إغلاق الإشعار" : "Dismiss notification"}
            className="rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-[var(--brand-surface)] rounded-2xl border p-5 flex flex-wrap gap-3 justify-between">

        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder={isArabic ? "ابحث عن طالب أو دورة..." : "Search student or course..."}
          className="rounded-xl border px-4 py-2"
        />

        <div className="flex gap-2 flex-wrap">
          {[
            ["all", isArabic ? "الكل" : "All"],
            ["pending", isArabic ? "قيد الانتظار" : "Pending"],
            ["paid", isArabic ? "مدفوع" : "Paid"],
            ["failed", isArabic ? "فشل" : "Failed"],
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
                {order.payment_method === "cliq" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                    <span className="text-sm font-semibold text-slate-600">
                      CliQ — {isArabic ? "مراجعة يدوية" : "Manual review"}
                    </span>

                    {order.payment_proof?.startsWith("https://") ? (
                      <a
                        href={order.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-blue-300 px-4 py-2 font-bold text-blue-800"
                      >
                        {isArabic ? "عرض الإثبات" : "View proof"}
                      </a>
                    ) : (
                      <span className="text-sm text-amber-700">
                        {isArabic ? "لا يوجد إثبات متاح للعرض" : "No proof available to view"}
                      </span>
                    )}

                    {order.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => void reviewCliq(order.id, "paid")}
                          disabled={
                            Boolean(busy) ||
                            !order.payment_proof?.startsWith("https://")
                          }
                          className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50"
                        >
                          {busy === order.id
    ? (isArabic ? "جارٍ التنفيذ..." : "Processing...")
    : (isArabic ? "تأكيد الدفع" : "Confirm payment")}
                        </button>

                        <button
                          type="button"
                          onClick={() => void reviewCliq(order.id, "failed")}
                          disabled={Boolean(busy)}
                          className="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700 disabled:opacity-50"
                        >
                          {isArabic ? "رفض الإثبات" : "Reject proof"}
                        </button>
                      </>
                    )}
                  </div>
                )}
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
