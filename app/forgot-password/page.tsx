"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { translateAuthMessage } from "@/lib/i18n/auth-message";
import { useLanguage } from "@/components/LanguageProvider";
import { GlobeIcon } from "@/components/icons";
import { recoveryErrorKey } from "@/lib/auth/password-recovery";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const { language, t } = useLanguage();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const pending = useRef(false);

  const validateForm = () => {
    if (!email.trim()) {
      setEmailError(t.auth.emailRequired);
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t.auth.invalidEmail);
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (pending.current) return;

    setMessage(null);
    setServerError(null);

    if (!validateForm()) {
      event.currentTarget.querySelector<HTMLInputElement>("#forgot-email")?.focus();
      return;
    }

    pending.current = true;
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setServerError(t.auth[recoveryErrorKey(error)]);
      else setMessage(t.auth.resetLinkSent);
    } catch { setServerError(t.auth.recoveryUnavailable); }
    finally { pending.current = false; setIsLoading(false); }
  };

  return (
    <AuthLayout
      title={t.auth.forgotTitle}
      description={t.auth.forgotDescription}
    >
      {message && (
        <div role="status" className="mb-5 rounded-xl border border-green-200 bg-[#f0fdf4] p-3 text-center text-sm text-[#166534]">
          {translateAuthMessage(message, language)}
        </div>
      )}

      {serverError && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-[#fef2f2] p-3 text-center text-sm text-[#b91c1c]">
          {translateAuthMessage(serverError, language)}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div>
          <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.email}
          </label>

          <div className="relative">
            <GlobeIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="forgot-email"
              dir="ltr"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "forgot-email-error" : undefined}
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 px-11 text-left text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                emailError
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />
          </div>

          {emailError && (
            <p id="forgot-email-error" role="alert" className="mt-1 text-sm text-red-200">
              {translateAuthMessage(emailError, language)}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
        >
          {isLoading ? t.auth.sending : t.auth.sendLink}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        <Link
          href="/login"
          className="font-bold text-[#d6b56c] hover:underline"
        >
          {t.auth.backToLogin}
        </Link>
      </div>
    </AuthLayout>
  );
}
