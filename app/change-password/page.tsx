"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChangePasswordPage() {

  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(
    e: React.FormEvent
  ) {
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

    const { error } =
      await supabase.auth.updateUser({
        password,
      });


    if (error) {
      setError(error.message);
    } else {
      setMessage("تم تغيير كلمة المرور بنجاح ✅");

      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    }

    setLoading(false);
  }


  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f5f8fc] p-4"
      dir="rtl"
    >

      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">


        <h1 className="text-2xl font-bold text-slate-800 text-center mb-3">
          تغيير كلمة المرور
        </h1>


        <p className="text-center text-slate-500 mb-8">
          قم بتحديث كلمة مرور حسابك
        </p>



        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}


        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm">
            {message}
          </div>
        )}



        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <input
            type="password"
            placeholder="كلمة المرور الجديدة"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl p-3"
          />


          <input
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e)=>setConfirm(e.target.value)}
            className="w-full bg-slate-50 border rounded-xl p-3"
          />



          <button
            disabled={loading}
            className="w-full bg-[#124b8a] text-white rounded-xl py-3 font-bold"
          >
            {loading
              ? "جاري التحديث..."
              : "تحديث كلمة المرور"}
          </button>


        </form>



        <Link
          href="/profile"
          className="block text-center mt-6 text-[#124b8a] font-bold"
        >
          العودة للملف الشخصي
        </Link>


      </div>

    </div>
  );
}
