"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const { language, t } = useLanguage();
  const isArabic = language === "ar";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);


  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password.length < 6) {
      setError(
        t.auth.passwordMin
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        t.auth.passwordMismatch
      );
      return;
    }


    setLoading(true);


    const { error } =
      await supabase.auth.updateUser({
        password,
      });


    if (error) {
      setError(error.message);
    } else {
      setMessage(
        t.auth.passwordUpdated
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }


    setLoading(false);
  }


  return (
    <div
      className="yw-auth-page min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c]"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="w-full max-w-md">

        <div className="text-center mb-8">

          <div className="yw-auth-brand mx-auto mb-6 flex items-center justify-center sm:mb-8">

            <BrandLogo variant="auth" priority />

          </div>


          <h1 className="text-3xl font-bold text-white">
            إنشاء كلمة مرور جديدة
          </h1>


          <p className="mt-2 text-white/70">
            أدخل كلمة المرور الجديدة لحسابك
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
          className="space-y-4"
        >

          <input
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            placeholder={t.auth.newPassword}
            className="w-full rounded-xl bg-white px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#d6b56c]"
          />


          <input
            type="password"
            value={confirmPassword}
            onChange={(e)=>setConfirmPassword(e.target.value)}
            placeholder={t.auth.confirmNewPassword}
            className="w-full rounded-xl bg-white px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#d6b56c]"
          />



          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white hover:bg-[#0d3b6e]"
          >
            {loading
              ? t.auth.saving
              : t.auth.updatePassword}
          </button>


        </form>



        <div className="mt-6 text-center">

          <Link
            href="/login"
            className="font-bold text-[#d6b56c]"
          >
            العودة لتسجيل الدخول
          </Link>

        </div>


      </div>

    </div>
  );
}
