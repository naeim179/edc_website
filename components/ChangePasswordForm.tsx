"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [sent, setSent] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-800 placeholder-slate-400 transition focus:border-[#124b8a]/40 focus:outline-none focus:ring-2 focus:ring-[#124b8a]/20";

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCheckingUser(false);
    }

    checkUser();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setMessage("تم تغيير كلمة المرور بنجاح ✅");
      setSent(true);
    }

    setLoading(false);
  }

  async function handleRelogin() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingUser) {
    return (
      <div className="flex justify-center py-16 text-sm text-slate-500">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      dir="rtl"
    >
      <h1 className="mb-3 text-center text-2xl font-bold text-slate-800">
        تغيير كلمة المرور
      </h1>

      <p className="mb-8 text-center text-slate-500">
        قم بتحديث كلمة مرور حسابك
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            placeholder="كلمة المرور الجديدة"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={inputClass}
          />

          <input
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            className={inputClass}
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition-colors hover:bg-[#0d3b6e] disabled:opacity-60"
          >
            {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <Link
            href="/profile"
            className="block w-full rounded-xl bg-[#124b8a] py-3 text-center font-bold text-white transition-colors hover:bg-[#0d3b6e]"
          >
            الذهاب للملف الشخصي الآن
          </Link>

          <button
            onClick={handleRelogin}
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 font-bold text-[#124b8a] transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "جاري تسجيل الخروج..." : "تسجيل الدخول من جديد"}
          </button>
        </div>
      )}

      {!sent && (
        <Link
          href="/profile"
          className="mt-6 block text-center font-bold text-[#124b8a] hover:underline"
        >
          العودة للملف الشخصي
        </Link>
      )}
    </div>
  );
}
