"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
            إنشاء حساب جديد
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            أنشئ حسابك وابدأ رحلة التعلم
          </p>

        </div>


        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <div className="relative">
            <UserIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              placeholder="الاسم الكامل"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 text-right text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30"
            />
          </div>


          <div className="relative">
            <GlobeIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="البريد الإلكتروني"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 text-right text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30"
            />
          </div>


          <div className="relative">

            <LockIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="كلمة المرور"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-12 text-right text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30"
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


          <div className="relative">

            <LockIcon
              width={19}
              height={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="تأكيد كلمة المرور"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-12 text-right text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30"
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


          <button
            disabled={isLoading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
          >
            {isLoading
              ? "جاري إنشاء الحساب..."
              : "إنشاء حساب"}
          </button>

        </form>


        <p className="mt-6 text-center text-sm text-slate-500">
          لديك حساب؟{" "}
          <Link
            href="/login"
            className="font-bold text-[#124b8a] hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>

      </div>
    </div>
  );
}
