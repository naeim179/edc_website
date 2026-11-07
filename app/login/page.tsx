"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLanguageSwitcher from "@/components/auth/AuthLanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import { loginWithIdentifier } from "@/app/actions/login";
import {
  LockIcon,
  GlobeIcon,
} from "@/components/icons";
import { PasswordToggle } from "@/components/password-toggle";
import { translateAuthMessage } from "@/lib/i18n/auth-message";
import { useLanguage } from "@/components/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isArabic = language === "ar";

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
      newErrors.email = t.auth.identifierRequired;
    }

    if (!password) {
      newErrors.password = t.auth.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password =
        t.auth.passwordMin;
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
      const result = await loginWithIdentifier(email, password);

      if (result.error) throw new Error(result.error);

      if (result.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch {
      setServerError(
        t.auth.loginFailed
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="yw-login-original min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c] p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md p-4 sm:p-8">
        <AuthLanguageSwitcher />
        <div className="mb-10 text-center">
          <div className="yw-auth-brand mx-auto mb-6 flex items-center justify-center sm:mb-8">
            <BrandLogo variant="auth" priority />
          </div>

          <h1 className="text-2xl font-bold text-white">
            {t.auth.login}
          </h1>

          <p className="mt-2 text-sm text-white/70">
            {t.auth.loginDescription}
          </p>
        </div>

        {serverError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {translateAuthMessage(serverError, language)}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div>
            <label htmlFor="login-identifier" className="mb-2 block text-sm font-medium text-white/90">
              {t.auth.identifier}
            </label>

            <div className="relative">
              <GlobeIcon
                width={19}
                height={19}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="login-identifier"
                dir="ltr"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder={t.auth.identifier}
                disabled={isLoading}
                className={`w-full rounded-xl border bg-slate-50 py-3 px-11 text-left text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                  errors.email
                    ? "border-red-400"
                    : "border-slate-200"
                }`}
              />
            </div>

            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {translateAuthMessage(errors.email, language)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-white/90">
              {t.auth.password}
            </label>

            <div className="relative">
              <LockIcon
                width={19}
                height={19}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full rounded-xl border bg-slate-50 py-3 ps-11 pe-12 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                  errors.password
                    ? "border-red-400"
                    : "border-slate-200"
                }`}
              />

              <div className="absolute end-3 top-1/2 -translate-y-1/2">
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() =>
                    setShowPassword((v) => !v)
                  }
                  label={t.auth.password}
                />
              </div>
            </div>

            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {translateAuthMessage(errors.password, language)}
              </p>
            )}

            <div className="mt-2 text-left">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[#d6b56c] hover:underline"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
          >
            {isLoading
              ? t.auth.loggingIn
              : t.auth.login}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/70">
          {t.auth.noAccount}{" "}
          <Link
            href="/register"
            className="font-bold text-[#d6b56c] hover:underline"
          >
            {t.auth.createAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
