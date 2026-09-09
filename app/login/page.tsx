"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};

    if (!email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (password.length < 6) {
      newErrors.password =
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch {
      setServerError(
        "فشل تسجيل الدخول، يرجى التأكد من البيانات"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-2xl flex items-center justify-center mx-auto mb-4">
            🎓
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            تسجيل الدخول
          </h1>

          <p className="text-sm text-slate-400">
            أدخل بيانات حسابك للمتابعة
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              البريد الإلكتروني
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.email
                  ? "border-red-400"
                  : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />

            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              كلمة المرور
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.password
                  ? "border-red-400"
                  : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />

            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#087a54] hover:bg-[#066b49] text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {isLoading
              ? "جاري تسجيل الدخول..."
              : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="text-[#087a54] font-medium hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </div>

      </div>
    </div>
  );
}
