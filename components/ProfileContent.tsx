"use client";

import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { useLanguage } from "@/components/LanguageProvider";

type ProfileContentProps = {
  profile: {
    full_name: string | null;
    phone: string | null;
    role: string | null;
  };
  email: string;
};

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d="M3 6.5C3 5.67 3.67 5 4.5 5h15c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m4 6.5 8 6.2 8-6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

export default function ProfileContent({
  profile,
  email,
}: ProfileContentProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const displayName =
    profile.full_name?.trim() || email.split("@")[0] || "User";

  const roleLabel =
    profile.role === "admin"
      ? isArabic
        ? "مدير المنصة"
        : "Platform Admin"
      : profile.role === "teacher"
      ? isArabic
        ? "مدرس"
        : "Teacher"
      : isArabic
      ? "طالب"
      : "Student";

  const avatar = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* User Header */}
      <section className="border-b border-slate-100 p-8 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#124b8a]/10 text-3xl font-bold text-[#124b8a] md:h-24 md:w-24 md:text-4xl">
              {avatar}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                {displayName}
              </h1>

              <p
                className="mt-1.5 text-sm text-slate-500 md:text-base"
                dir="ltr"
              >
                {email}
              </p>

              <span className="mt-3 inline-flex items-center rounded-full bg-[#124b8a]/10 px-4 py-1.5 text-sm font-bold text-[#124b8a]">
                {roleLabel}
              </span>
            </div>
          </div>

          {profile.role === "student" && (
            <Link
              href="/my-courses"
              className="rounded-xl bg-[#124b8a] px-7 py-3 text-center font-bold text-white transition-colors hover:bg-[#0d3b6e]"
            >
              {isArabic ? "دوراتي التعليمية" : "My Courses"}
            </Link>
          )}
        </div>
      </section>

      {/* Personal Info Form */}
      <section className="p-8 md:p-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 md:text-2xl">
            {isArabic ? "معلومات الحساب" : "Account Information"}
          </h2>

          <p className="mt-1.5 text-sm text-slate-500">
            {isArabic
              ? "قم بتحديث معلوماتك الشخصية."
              : "Update your personal information."}
          </p>
        </div>

        <ProfileForm profile={profile} />
      </section>

      {/* Account Settings */}
      <section className="border-t border-slate-100 px-8 pb-8 pt-8 md:px-10 md:pb-10">
        <h2 className="mb-5 text-xl font-bold text-slate-800 md:text-2xl">
          {isArabic ? "إعدادات الحساب" : "Account Settings"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:bg-white hover:shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#124b8a]/10 text-[#124b8a]">
                <MailIcon />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {isArabic ? "البريد الإلكتروني" : "Email"}
              </h3>
            </div>

            <p className="mb-5 text-sm text-slate-500" dir="ltr">
              {email}
            </p>

            <Link
              href="/change-email"
              className="mt-auto inline-flex justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-[#124b8a] transition-colors hover:bg-[#124b8a] hover:text-white"
            >
              {isArabic ? "تغيير البريد الإلكتروني" : "Change Email"}
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:bg-white hover:shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#124b8a]/10 text-[#124b8a]">
                <LockIcon />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {isArabic ? "أمان الحساب" : "Account Security"}
              </h3>
            </div>

            <p className="mb-5 text-sm text-slate-500">
              {isArabic
                ? "يمكنك تحديث كلمة المرور من هنا."
                : "Manage your password security."}
            </p>

            <Link
              href="/change-password"
              className="mt-auto inline-flex justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-[#124b8a] transition-colors hover:bg-[#124b8a] hover:text-white"
            >
              {isArabic ? "تغيير كلمة المرور" : "Change Password"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
