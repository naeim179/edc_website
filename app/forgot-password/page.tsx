"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/reset-password`,
        }
      );

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
      );
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c]"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">

        <div className="text-center mb-7">
          <Image
            src="/logo/logo-transparent.png"
            alt="Your Way"
            width={170}
            height={170}
            className="mx-auto mb-3 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-800">
            نسيت كلمة المرور؟
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور
          </p>
        </div>


        {message && (
          <div className="mb-5 rounded-xl bg-green-50 p-3 text-center text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <input
            type="email"
            required
            value={email}
            onChange={(e)=>
              setEmail(e.target.value)
            }
            placeholder="name@example.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-[#124b8a]/30"
          />


          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white hover:bg-[#0d3b6e]"
          >
            {loading
              ? "جاري الإرسال..."
              : "إرسال الرابط"}
          </button>

        </form>


        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="font-bold text-[#124b8a]"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>

      </div>
    </div>
  );
}
