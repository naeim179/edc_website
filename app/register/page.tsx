"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
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
      const {
        error: signUpError,
      } = await supabase.auth.signUp({
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
      className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border p-8 shadow-sm">

        <h1 className="text-2xl font-bold text-center mb-6">
          إنشاء حساب جديد
        </h1>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
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
            className="w-full border rounded-lg p-3 text-right"
          />

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="البريد الإلكتروني"
            className="w-full border rounded-lg p-3 text-right"
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="كلمة المرور"
            className="w-full border rounded-lg p-3 text-right"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="تأكيد كلمة المرور"
            className="w-full border rounded-lg p-3 text-right"
          />

          <button
            disabled={isLoading}
            className="w-full bg-[#087a54] text-white py-3 rounded-lg font-bold disabled:opacity-50"
          >
            {isLoading
              ? "جاري إنشاء الحساب..."
              : "إنشاء حساب"}
          </button>

        </form>

        <p className="text-center text-sm mt-6">
          لديك حساب؟
          {" "}
          <Link
            href="/login"
            className="text-[#087a54] font-bold"
          >
            تسجيل الدخول
          </Link>
        </p>

      </div>
    </div>
  );
}
