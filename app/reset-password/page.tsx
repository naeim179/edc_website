"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

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
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "كلمتا المرور غير متطابقتين"
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
        "تم تحديث كلمة المرور بنجاح"
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }


    setLoading(false);
  }


  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c]"
      dir="rtl"
    >

      <div className="w-full max-w-md">

        <div className="text-center mb-8">

          <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-[0_15px_40px_rgba(0,0,0,0.18)]">

            <Image
              src="/logo/logo.png"
              alt="Your Way"
              width={150}
              height={150}
              priority
              className="object-contain rounded-full"
            />

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
            placeholder="كلمة المرور الجديدة"
            className="w-full rounded-xl bg-white px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#d6b56c]"
          />


          <input
            type="password"
            value={confirmPassword}
            onChange={(e)=>setConfirmPassword(e.target.value)}
            placeholder="تأكيد كلمة المرور"
            className="w-full rounded-xl bg-white px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#d6b56c]"
          />



          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white hover:bg-[#0d3b6e]"
          >
            {loading
              ? "جاري الحفظ..."
              : "تغيير كلمة المرور"}
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
