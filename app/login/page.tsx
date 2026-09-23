"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  LockIcon,
  GlobeIcon,
} from "@/components/icons";
import { PasswordToggle } from "@/components/password-toggle";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

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

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

      if (profileError) throw profileError;

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
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c]"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[32px] border border-white/40 bg-white/95 shadow-2xl p-8 backdrop-blur">

        <div className="text-center mb-7">

          <Image
            src="/logo/logo.png"
            alt="Your Way"
            width={170}
            height={170}
            className="mx-auto mb-3 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-800">
            تسجيل الدخول
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            أدخل بيانات حسابك للمتابعة
          </p>

        </div>


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
            <label className="mb-2 block text-sm font-medium text-slate-700">
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
                  errors.email
                    ? "border-red-400"
                    : "border-slate-200"
                }`}
              />
            </div>

            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>


          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              كلمة المرور
            </label>

            <div className="relative">

              <LockIcon
                width={19}
                height={19}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full rounded-xl border bg-slate-50 py-3 pr-11 pl-12 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                  errors.password
                    ? "border-red-400"
                    : "border-slate-200"
                }`}
              />

              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() =>
                    setShowPassword((v) => !v)
                  }
                  label="كلمة المرور"
                />
              </div>

            </div>

            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password}
              </p>
            )}

            <div className="mt-2 text-left">
              <Link
                href="#"
                className="text-sm font-semibold text-[#124b8a] hover:underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

          </div>


          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
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
            className="font-bold text-[#124b8a] hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </div>

      </div>
    </div>
  );
}
