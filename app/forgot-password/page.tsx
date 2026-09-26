"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { GlobeIcon } from "@/components/icons";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!email) {
      setEmailError("البريد الإلكتروني مطلوب");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("صيغة البريد الإلكتروني غير صحيحة");
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage(null);
    setServerError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      setServerError(error.message);
    } else {
      setMessage(
        "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
      );
    }

    setIsLoading(false);
  };

  return (
    <AuthLayout
      title="نسيت كلمة المرور؟"
      description="أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور"
    >
      {message && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
          {message}
        </div>
      )}

      {serverError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            البريد الإلكتروني
          </label>

          <div className="relative">
            <GlobeIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 pr-11 pl-4 text-left text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                emailError
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />
          </div>

          {emailError && (
            <p className="mt-1 text-xs text-red-500">
              {emailError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
        >
          {isLoading ? "جاري الإرسال..." : "إرسال الرابط"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        <Link
          href="/login"
          className="font-bold text-[#d6b56c] hover:underline"
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </AuthLayout>
  );
}
