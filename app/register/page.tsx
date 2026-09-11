"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);

    if (!fullName.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      router.push("/login");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "فشل إنشاء الحساب"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f5f8fc] p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-lg p-8">

        <div className="text-center mb-8">

          <Image
            src="/logo/logo.png"
            alt="Your Way"
            width={180}
            height={120}
            className="mx-auto mb-5 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            إنشاء حساب جديد
          </h1>

          <p className="text-sm text-slate-400">
            أنشئ حسابك وابدأ رحلة التعلم
          </p>

        </div>


        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {error}
          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <input
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="الاسم الكامل"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />


          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="البريد الإلكتروني"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />


          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="كلمة المرور"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />


          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="تأكيد كلمة المرور"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />


          <button
            disabled={isLoading}
            className="w-full bg-[#124b8a] hover:bg-[#0d3b6e] text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
          >
            {isLoading
              ? "جاري إنشاء الحساب..."
              : "إنشاء حساب"}
          </button>

        </form>


        <p className="text-center text-sm mt-6 text-slate-500">
          لديك حساب؟{" "}
          <Link
            href="/login"
            className="text-[#124b8a] font-bold hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>

      </div>
    </div>
  );
}
