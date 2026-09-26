"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangeEmailForm() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-800 placeholder-slate-400 transition focus:border-[#124b8a]/40 focus:outline-none focus:ring-2 focus:ring-[#124b8a]/20";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setError(error.message);
    } else {
      setMessage("تم إرسال رابط التأكيد إلى البريد الجديد ✅");
      setSent(true);
    }

    setLoading(false);
  }

  async function handleResend() {
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setError(error.message);
    } else {
      setMessage("تم إعادة إرسال رابط التأكيد ✅");
    }

    setLoading(false);
  }

  return (
    <div
      className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      dir="rtl"
    >
      <h1 className="mb-3 text-center text-2xl font-bold text-slate-800">
        تغيير البريد الإلكتروني
      </h1>

      <p className="mb-8 text-center text-slate-500">
        أدخل البريد الجديد لتحديث حسابك
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="new@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={inputClass}
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition-colors hover:bg-[#0d3b6e] disabled:opacity-60"
          >
            {loading ? "جاري الإرسال..." : "تحديث البريد"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition-colors hover:bg-[#0d3b6e] disabled:opacity-60"
          >
            {loading ? "جاري الإرسال..." : "إرسال الرابط مرة أخرى"}
          </button>

          <Link
            href="/profile"
            className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center font-bold text-[#124b8a] transition-colors hover:bg-slate-50"
          >
            العودة للملف الشخصي
          </Link>
        </div>
      )}

      {!sent && (
        <Link
          href="/profile"
          className="mt-6 block text-center font-bold text-[#124b8a] hover:underline"
        >
          العودة للملف الشخصي
        </Link>
      )}
    </div>
  );
}
