"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { useLanguage } from "@/components/LanguageProvider";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import { RECOVERY_MARKER, recoveryErrorKey, verifyPasswordRecovery, type RecoveryResult } from "@/lib/auth/password-recovery";
import { translateAuthMessage } from "@/lib/i18n/auth-message";

export default function ResetPasswordPage() {
  const { t, language } = useLanguage();
  const client = useRef<ReturnType<typeof createRecoveryClient> | null>(null);
  const verification = useRef<{ href: string; promise: Promise<RecoveryResult> } | null>(null);
  const pending = useRef(false);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "unavailable">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    let latestRun = 0;
    let processing = false;
    function verifyCurrentLink(force = false) {
      const href = window.location.href;
      // Deduplicate Strict Mode and serialize navigation between single-use links.
      if (force || verification.current?.href !== href) {
        const previous = verification.current?.promise;
        const promise = (async (): Promise<RecoveryResult> => {
          try {
            await previous;
            client.current ??= createRecoveryClient();
            let storage: Storage | undefined;
            try { storage = window.sessionStorage; } catch {}
            return await verifyPasswordRecovery(client.current.auth, href, storage);
          } catch { return { ok: false, error: "unavailable" }; }
          finally {
            // An older request must not erase a newer recovery link.
            if (window.location.href === href) {
              window.history.replaceState(window.history.state, "", window.location.pathname);
            }
          }
        })();
        verification.current = { href, promise };
      }
      const run = ++latestRun;
      processing = true;
      void verification.current!.promise.then(result => {
        if (run !== latestRun) return;
        processing = false;
        if (active) setState(result.ok ? "ready" : result.error);
      });
    }
    function handleNavigation() {
      if (window.location.pathname !== "/reset-password") return;
      if (processing && verification.current?.href === window.location.href) return;
      setState("checking"); setError(""); setDone(false);
      setPassword(""); setConfirmPassword("");
      verifyCurrentLink(true);
    }
    verifyCurrentLink();
    window.addEventListener("hashchange", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    return () => {
      active = false;
      window.removeEventListener("hashchange", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "ready" || pending.current || !client.current) return;
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.auth.newPasswordMin);
      event.currentTarget.querySelector<HTMLInputElement>("#reset-password")?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      event.currentTarget.querySelector<HTMLInputElement>("#reset-confirm")?.focus();
      return;
    }
    pending.current = true; setLoading(true);
    const currentVerification = verification.current;
    try {
      const { error: updateError } = await client.current.auth.updateUser({ password });
      if (verification.current !== currentVerification) return;
      if (updateError) setError(t.auth[recoveryErrorKey(updateError)]);
      else {
        setDone(true); setPassword(""); setConfirmPassword("");
        try { window.sessionStorage.removeItem(RECOVERY_MARKER); } catch {}
      }
    } catch { setError(t.auth.recoveryUnavailable); }
    finally { pending.current = false; setLoading(false); }
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !client.current) return;
    pending.current = true; setLoading(true); setError("");
    try {
      const { error: signOutError } = await client.current.auth.signOut({ scope: "local" });
      if (signOutError) setError(t.auth.recoveryUnavailable);
      else window.location.replace("/login");
    } catch { setError(t.auth.recoveryUnavailable); }
    finally { pending.current = false; setLoading(false); }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-[#d6b56c] disabled:opacity-60";
  return (
    <AuthLayout title={t.auth.resetTitle} description={t.auth.resetDescription}>
      {state === "checking" && <p role="status" className="text-center text-white/90">{t.auth.recoveryChecking}</p>}
      {(state === "invalid" || state === "unavailable") && (
        <div className="space-y-5 text-center">
          <p role="alert" className="rounded-xl border border-red-200 bg-[#fef2f2] p-4 text-sm text-[#b91c1c]">
            {state === "invalid" ? t.auth.recoveryInvalid : t.auth.recoveryUnavailable}
          </p>
          <Link className="inline-block font-bold text-[#d6b56c] underline" href="/forgot-password">{t.auth.recoveryNewLink}</Link>
        </div>
      )}
      {error && <p id="reset-error" role="alert" className="mb-5 rounded-xl border border-red-200 bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">{translateAuthMessage(error, language)}</p>}
      {state === "ready" && !done && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="reset-password" className="mb-2 block text-sm font-medium text-white/90">{t.auth.newPassword}</label>
            <input id="reset-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={password} onChange={e => setPassword(e.target.value)} disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-2 block text-sm font-medium text-white/90">{t.auth.confirmNewPassword}</label>
            <input id="reset-confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} className={fieldClass} />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white disabled:opacity-60">{loading ? t.auth.saving : t.auth.updatePassword}</button>
        </form>
      )}
      {done && (
        <form onSubmit={finish} className="space-y-5">
          <p role="status" className="rounded-xl border border-green-200 bg-[#f0fdf4] p-4 text-center text-sm text-[#166534]">{t.auth.passwordUpdated}</p>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#124b8a] py-3 font-bold text-white disabled:opacity-60">{loading ? t.auth.loggingOut : t.auth.loginAgain}</button>
        </form>
      )}
      {!done && <div className="mt-6 text-center text-sm"><Link href="/login" className="font-bold text-[#d6b56c]">{t.auth.backToLogin}</Link></div>}
    </AuthLayout>
  );
}
