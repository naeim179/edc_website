"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) newErrors.fullName = "الاسم الكامل مطلوب";

    if (!email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "تأكيد كلمة المرور مطلوب";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "كلمتا المرور غير متطابقتين";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    // TODO: استبدال هذا بطلب التسجيل الفعلي عند جهوزية الـ API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);

    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">إنشاء حساب جديد</h1>
          <p className="text-sm text-slate-400">سجّل بياناتك للبدء برحلتك التعليمية</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="خالد العتيبي"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.fullName ? "border-red-400" : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.email ? "border-red-400" : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.password ? "border-red-400" : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-50 border ${
                errors.confirmPassword ? "border-red-400" : "border-slate-200"
              } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087a54]/30 transition disabled:opacity-50`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#087a54] hover:bg-[#066b49] text-white font-bold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>جاري إنشاء الحساب...</span>
              </>
            ) : (
              "إنشاء حساب"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-[#087a54] hover:text-[#066b49] font-medium transition underline-offset-4 hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}