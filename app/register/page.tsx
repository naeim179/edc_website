"use client";

import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

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
import { translateAuthMessage } from "@/lib/i18n/auth-message";
import { useLanguage } from "@/components/LanguageProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    username?: string;
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
    username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = t.auth.nameRequired;
    }

    if (!username.trim()) {
      newErrors.username = t.auth.usernameRequired;
    } else if (!/^[A-Za-z0-9_.]{3,30}$/.test(username.trim())) {
      newErrors.username =
        t.auth.usernameFormat;
    }

    if (!email) {
      newErrors.email = t.auth.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t.auth.invalidEmail;
    }

    if (!password) {
      newErrors.password = t.auth.passwordRequired;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password =
        t.auth.newPasswordMin;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t.auth.passwordMismatch;
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
      const { data: available, error: availError } =
        await supabase.rpc("is_username_available", {
          p_username: username.trim(),
        });

      if (availError) throw availError;

      if (!available) {
        setErrors((prev) => ({
          ...prev,
          username: t.auth.usernameTaken,
        }));
        return;
      }

      const { error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username.trim(),
            },
          },
        });

      if (signUpError) throw signUpError;

      router.push("/login");
    } catch (err) {
      setServerError(
        err instanceof Error
          ? /database error/i.test(err.message)
            ? t.auth.accountExists
            : err.message
          : t.auth.registerFailed
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.auth.createAccount}
      description={t.auth.registerDescription}
    >
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
          <label htmlFor="register-fullName" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.fullName}
          </label>

          <div className="relative">
            <UserIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input id="register-fullName"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder={t.auth.fullName}
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 ps-11 pe-4 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                errors.fullName
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />
          </div>

          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">
              {translateAuthMessage(errors.fullName, language)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-username" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.username}
          </label>

          <div className="relative">
            <UserIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input id="register-username"
              type="text"
              dir="ltr"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.replace(/\s/g, ""))
              }
              placeholder="username"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 px-11 text-left text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                errors.username
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />
          </div>

          {errors.username && (
            <p className="mt-1 text-xs text-red-500">
              {translateAuthMessage(errors.username, language)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.email}
          </label>

          <div className="relative">
            <GlobeIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input id="register-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
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
          <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.password}
          </label>

          <div className="relative">
            <LockIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input id="register-password"
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
        </div>

        <div>
          <label htmlFor="register-confirmPassword" className="mb-2 block text-sm font-medium text-white/90">
            {t.auth.confirmPassword}
          </label>

          <div className="relative">
            <LockIcon
              width={19}
              height={19}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input id="register-confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 py-3 ps-11 pe-12 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 ${
                errors.confirmPassword
                  ? "border-red-400"
                  : "border-slate-200"
              }`}
            />

            <div className="absolute end-3 top-1/2 -translate-y-1/2">
              <PasswordToggle
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((v) => !v)
                }
                label={t.auth.confirmPassword}
              />
            </div>
          </div>

          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {translateAuthMessage(errors.confirmPassword, language)}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
        >
          {isLoading ? t.auth.creatingAccount : t.auth.register}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        {t.auth.haveAccount}{" "}
        <Link
          href="/login"
          className="font-bold text-[#d6b56c] hover:underline"
        >
          {t.auth.login}
        </Link>
      </div>
    </AuthLayout>
  );
}
