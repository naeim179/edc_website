"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import {
  LockIcon,
  GlobeIcon,
  UserIcon,
} from "@/components/icons";
import { PasswordToggle } from "@/components/password-toggle";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "الاسم مطلوب";
    }

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

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "كلمتا المرور غير متطابقتين";
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

      if (signUpError) throw signUpError;

      router.push("/login");
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "فشل إنشاء الحساب"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      description="أنشئ حسابك وابدأ رحلة التعلم"
    >
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
            الاسم الكامل
          </label>

          <div className="relative">
            <UserIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="الاسم الكامل"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 pr-11 pl-4 text-white outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                errors.fullName
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />
          </div>

          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">
              {errors.fullName}
            </p>
          )}
        </div>

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
          <label className="mb-2 block text-sm font-medium text-white/90">
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
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            تأكيد كلمة المرور
          </label>

          <div className="relative">
            <LockIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 pr-11 pl-12 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                errors.confirmPassword
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />

            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <PasswordToggle
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((v) => !v)
                }
                label="تأكيد كلمة المرور"
              />
            </div>
          </div>

          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
        >
          {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        لديك حساب؟{" "}
        <Link
          href="/login"
          className="font-bold text-[#d6b56c] hover:underline"
        >
          تسجيل الدخول
        </Link>
      </div>
    </AuthLayout>
  );
}
