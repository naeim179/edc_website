"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import AuthLanguageSwitcher from "@/components/auth/AuthLanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

type Status = "optional" | "setup" | "verify" | "ready" | "recovery";
type Enrollment = { id: string; qr: string; secret: string };
type Authenticator = { id: string; label: string | null; approved: boolean };

const copy = {
  ar: {
    title: "المصادقة الثنائية للإدارة",
    setup: "اربط حسابك بتطبيق مصادقة مثل Google Authenticator. ستستخدم رمزه عند تسجيل الدخول مجددًا إلى لوحة الإدارة.",
    verify: "أدخل الرمز الحالي من تطبيق المصادقة لإكمال الدخول إلى لوحة الإدارة.",
    scan: "امسح رمز الاستجابة السريعة أو أدخل مفتاح الإعداد يدويًا، ثم اكتب الرمز الذي يظهر في التطبيق.",
    ready: "تحقّقت المصادقة الثنائية لهذه الجلسة.",
    recovery: "يتطلب هذا الحساب استعادة عامل المصادقة. تواصل مع مسؤول المنصة لإعادة الإعداد.",
    label: "رمز المصادقة من ٦ أرقام",
    invalid: "أدخل رمزًا من ستة أرقام.",
    rejected: "تعذّر التحقق من الرمز. استخدم الرمز الحالي في تطبيق المصادقة وحاول مجددًا.",
    unavailable: "تعذّر إكمال العملية. تحقّق من الاتصال وحاول مجددًا.",
    enable: "ربط تطبيق المصادقة",
    submit: "تحقّق من الرمز",
    proceed: "الانتقال إلى الإدارة",
    working: "جارٍ التحقق…",
    later: "الإعداد لاحقًا",
    manual: "مفتاح الإعداد اليدوي",
    qr: "رمز إعداد تطبيق المصادقة",
    logout: "تسجيل الخروج",
    devices: "تطبيقات المصادقة",
    device: "تطبيق المصادقة",
    addDevice: "ربط تطبيق بديل",
    chooseDevice: "التطبيق الذي سيولّد الرمز",
    removeDevice: "إلغاء ربط التطبيق",
    approveDevice: "إكمال ربط التطبيق",
    pendingDevice: "بانتظار اعتماد الربط",
    confirmRemove: "هل تريد إلغاء ربط هذا التطبيق؟ سيبقى التطبيق البديل مرتبطًا بحسابك.",
    replacementRequired: "اربط تطبيقًا بديلًا وتحقّق من رمزه قبل إزالة التطبيق الحالي.",
    cancelSetup: "إلغاء الإعداد",
    retryRegistration: "إعادة محاولة اعتماد التطبيق",
    removeIncomplete: "تعذّرت إزالة التطبيق من خدمة المصادقة. أعد المحاولة لإكمال إلغاء الربط.",
  },
  en: {
    title: "Admin two-factor authentication",
    setup: "Link your account to an authenticator app such as Google Authenticator. You’ll use its code the next time you sign in to the admin dashboard.",
    verify: "Enter the current code from your authenticator app to access the admin dashboard.",
    scan: "Scan the QR code or enter the setup key manually, then enter the code shown in the app.",
    ready: "Two-factor authentication is verified for this session.",
    recovery: "This account requires authenticator recovery. Contact the platform administrator to set up a new factor.",
    label: "Six-digit authentication code",
    invalid: "Enter a six-digit code.",
    rejected: "The code could not be verified. Enter the current code from your authenticator app and try again.",
    unavailable: "Unable to complete the request. Check your connection and try again.",
    enable: "Link authenticator app",
    submit: "Verify code",
    proceed: "Continue to admin",
    working: "Checking…",
    later: "Set up later",
    manual: "Manual setup key",
    qr: "Authenticator setup code",
    logout: "Sign out",
    devices: "Authenticator apps",
    device: "Authenticator app",
    addDevice: "Link a replacement app",
    chooseDevice: "App generating the code",
    removeDevice: "Unlink app",
    approveDevice: "Finish linking app",
    pendingDevice: "Link pending approval",
    confirmRemove: "Unlink this app? Your replacement app will stay linked to your account.",
    replacementRequired: "Link a replacement app and verify its code before unlinking the current app.",
    cancelSetup: "Cancel setup",
    retryRegistration: "Retry linking the app",
    removeIncomplete: "The authentication service could not remove the app. Try again to finish unlinking it.",
  },
};

const button = "w-full rounded-xl bg-[var(--calm-accent)] px-4 py-3 font-semibold text-[var(--calm-on-accent)] hover:bg-[var(--calm-hover)] disabled:opacity-60";
const factorName = "Your Way Academy";

export default function AdminMfaForm({
  status,
  authenticators = [],
}: {
  status: Status;
  authenticators?: Authenticator[];
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const t = copy[language === "ar" ? "ar" : "en"];
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [selectedFactor, setSelectedFactor] = useState("");
  const [approvalFactor, setApprovalFactor] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(status === "ready");
  const pending = useRef(false);
  const canEnroll = status === "optional" || status === "setup";
  const managing = status === "ready";
  const approved = authenticators.filter(factor => factor.approved);
  const isSettingUp = Boolean(enrollment || approvalFactor || pendingRegistration);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError(t.unavailable);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function enroll() {
    const supabase = createClient();
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    if (!managing && factors.totp.length) {
      window.location.reload();
      return;
    }
    for (const pendingFactor of factors.all) {
      const name = pendingFactor.friendly_name;
      if (pendingFactor.factor_type === "totp" && pendingFactor.status === "unverified"
          && (name === factorName || name?.startsWith(`${factorName} `))) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
        if (error) throw error;
      }
    }
    const names = new Set(factors.totp.map(factor => factor.friendly_name));
    let friendlyName = factorName;
    for (let suffix = 2; names.has(friendlyName); suffix++) friendlyName = `${factorName} ${suffix}`;
    const { data: factor, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
      issuer: factorName,
    });
    if (enrollmentError) throw enrollmentError;
    setEnrollment({ id: factor.id, qr: factor.totp.qr_code, secret: factor.totp.secret });
  }

  async function finish() {
    const { error } = await createClient().rpc("finish_admin_mfa_setup");
    if (error) throw error;
    window.location.replace("/admin");
  }

  async function registerReplacement(factorId: string) {
    const { data, error } = await createClient().rpc("update_admin_authenticator", {
      p_factor_id: factorId, p_remove: false,
    });
    if (error || data !== true) throw error ?? new Error("Unable to register authenticator");
    window.location.reload();
  }

  async function removeFactor(factor: Authenticator) {
    if (!window.confirm(t.confirmRemove)) return;
    const supabase = createClient();
    const preparation = await supabase.rpc("update_admin_authenticator", {
      p_factor_id: factor.id, p_remove: true,
    });
    if (preparation.error) throw preparation.error;
    if (preparation.data !== true) {
      setError(t.replacementRequired);
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      // Refresh the old factor's approval status so provider removal can be retried.
      setError(t.removeIncomplete);
      router.refresh();
      return;
    }
    window.location.reload();
  }

  async function cancelSetup() {
    if (enrollment) {
      const { error } = await createClient().auth.mfa.unenroll({ factorId: enrollment.id });
      if (error) throw error;
    }
    setEnrollment(null);
    setApprovalFactor(null);
  }

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    const digits = String(code ?? "").trim().replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) & 15));
    if (!/^\d{6}$/.test(digits)) {
      setError(t.invalid);
      return;
    }
    void run(async () => {
      const supabase = createClient();
      const factorId = enrollment?.id ?? approvalFactor ?? (selectedFactor || approved[0]?.id);
      if (!factorId) throw new Error("No verified factor");
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code: digits });
      if (result.error) {
        setError(t.rejected);
        return;
      }
      setEnrollment(null);
      if (managing) {
        setApprovalFactor(null);
        setPendingRegistration(factorId);
        await registerReplacement(factorId);
        return;
      }
      setVerified(true);
      await finish();
    });
  }

  return (
    <main dir={language === "ar" ? "rtl" : "ltr"} className="yw-admin-mfa grid min-h-screen place-items-center bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c] p-4 [color-scheme:light]">
      <section className="min-w-0 w-full max-w-md rounded-2xl bg-[var(--calm-surface)] p-6 text-[var(--calm-text)] shadow-lg sm:p-8">
        <AuthLanguageSwitcher />
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="my-4 text-base leading-relaxed text-[var(--calm-muted)]">
          {enrollment ? t.scan : approvalFactor ? t.verify : verified ? t.ready : status === "recovery" ? t.recovery : canEnroll ? t.setup : t.verify}
        </p>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {verified && !isSettingUp && <button type="button" disabled={busy} onClick={() => void run(finish)} className={button}>{busy ? t.working : t.proceed}</button>}
        {managing && !isSettingUp && (
          <section className="mt-5 space-y-3 border-t border-[var(--calm-border)] pt-4">
            <h2 className="font-bold">{t.devices}</h2>
            <p className="text-sm text-[var(--calm-muted)]">{t.replacementRequired}</p>
            {authenticators.map(factor => (
              <div key={factor.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span dir="auto">{factor.label || t.device}{!factor.approved && ` · ${t.pendingDevice}`}</span>
                <div className="flex flex-wrap gap-3 font-semibold text-[var(--calm-accent)]">
                  {!factor.approved && <button type="button" disabled={busy} onClick={() => setApprovalFactor(factor.id)} className="min-h-11 underline">{t.approveDevice}</button>}
                  <button type="button" disabled={busy || !approved.some(other => other.id !== factor.id)}
                    onClick={() => void run(() => removeFactor(factor))} className="min-h-11 underline disabled:opacity-60">
                    {t.removeDevice}
                  </button>
                </div>
              </div>
            ))}
            <button type="button" disabled={busy} onClick={() => void run(enroll)} className={button}>{t.addDevice}</button>
          </section>
        )}
        {canEnroll && !enrollment && !verified && (
          <button type="button" disabled={busy} onClick={() => void run(enroll)} className={button}>{busy ? t.working : t.enable}</button>
        )}
        {enrollment && (
          <div className="mb-5 text-center">
            {/* The provider generates this data URI on demand for this enrollment. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qr} alt={t.qr} width="180" height="180" className="mx-auto" />
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer">{t.manual}</summary>
              <code dir="ltr" className="break-all">{enrollment.secret}</code>
            </details>
          </div>
        )}
        {pendingRegistration && (
          <button type="button" disabled={busy} onClick={() => void run(() => registerReplacement(pendingRegistration))} className={button}>
            {busy ? t.working : t.retryRegistration}
          </button>
        )}
        {(enrollment || approvalFactor || (!verified && status === "verify")) && (
          <form onSubmit={verify} className="space-y-3">
            {!isSettingUp && approved.length > 1 && (
              <label className="block space-y-1 text-sm font-semibold">
                <span>{t.chooseDevice}</span>
                <select value={selectedFactor || approved[0].id} onChange={event => setSelectedFactor(event.target.value)}
                  className="block w-full rounded-xl border p-3">
                  {approved.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.label || `${t.device} ${index + 1}`}</option>)}
                </select>
              </label>
            )}
            <label htmlFor="admin-mfa-code" className="block text-sm font-semibold">{t.label}</label>
            <input id="admin-mfa-code" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              className="w-full rounded-xl border border-[var(--calm-border)] p-3 text-center text-base" required />
            <button type="submit" disabled={busy} className={button}>{busy ? t.working : t.submit}</button>
          </form>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 text-sm font-semibold text-[var(--calm-accent)]">
          {(enrollment || approvalFactor) && <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => void run(cancelSetup)}>{t.cancelSetup}</button>}
          {status === "optional" && !verified && <Link href="/admin" className="inline-flex min-h-11 items-center underline underline-offset-4">{t.later}</Link>}
          <button type="button" disabled={busy} className="inline-flex min-h-11 items-center underline underline-offset-4" onClick={() => void run(async () => {
            const { error } = await createClient().auth.signOut({ scope: "local" });
            if (error) throw error;
            window.location.replace("/login");
          })}>{t.logout}</button>
        </div>
      </section>
    </main>
  );
}
