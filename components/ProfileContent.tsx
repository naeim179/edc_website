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

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8.5 12.3 2.3 2.3 4.7-4.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path
        d="M4 16.5 9.5 11l3.5 3.5L20 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h5v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    profile.full_name?.trim() ||
    email.split("@")[0] ||
    "User";


  const roleLabel =
    profile.role === "admin"
      ? isArabic
        ? "مدير المنصة"
        : "Platform Admin"
      : isArabic
        ? "طالب"
        : "Student";


  const avatar =
    displayName.charAt(0).toUpperCase();


  const stats = [
    {
      title: isArabic ? "الدورات المسجلة" : "Enrolled Courses",
      value: "0",
      icon: <BookIcon />,
    },
    {
      title: isArabic ? "الدروس المكتملة" : "Completed Lessons",
      value: "0",
      icon: <CheckCircleIcon />,
    },
    {
      title: isArabic ? "نسبة الإنجاز" : "Progress",
      value: "0%",
      icon: <TrendIcon />,
    },
  ];


  return (
    <div
      className="max-w-5xl mx-auto w-full bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >


      {/* User Header */}
      <section className="relative p-8 md:p-10 bg-gradient-to-br from-[#124b8a]/[0.04] via-white to-[#d6b56c]/[0.08]">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">


          <div className="flex items-center gap-5">


            <div className="relative shrink-0">

              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-[#124b8a] to-[#d6b56c] p-[3px] shadow-lg shadow-[#124b8a]/20">

                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl md:text-5xl font-black text-[#124b8a]">
                  {avatar}
                </div>

              </div>

            </div>



            <div>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                {displayName}
              </h1>


              <p
                className="text-slate-500 mt-1.5 text-sm md:text-base"
                dir="ltr"
              >
                {email}
              </p>


              <span className="inline-flex items-center mt-3 px-4 py-1.5 rounded-full bg-[#124b8a]/10 text-[#124b8a] text-sm font-bold">
                {roleLabel}
              </span>


            </div>


          </div>



          {profile.role === "student" && (
            <Link
              href="/my-courses"
              className="bg-[#124b8a] hover:bg-[#0d3b6e] text-white px-7 py-3 rounded-xl font-bold transition shadow-md shadow-[#124b8a]/20 text-center"
            >
              {isArabic
                ? "دوراتي التعليمية"
                : "My Courses"}
            </Link>
          )}


        </div>

      </section>



      <div className="border-t border-slate-100" />



      {/* Tabs */}
      <div className="px-8 md:px-10 pt-6 text-sm font-bold">

        <button className="text-[#124b8a] border-b-2 border-[#124b8a] pb-3">
          {isArabic ? "الملف الشخصي" : "Profile"}
        </button>

      </div>



      {/* Personal Info Form */}
      <section className="p-8 md:p-10">

        <div className="mb-6">

          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            {isArabic
              ? "معلومات الحساب"
              : "Account Information"}
          </h2>


          <p className="text-sm text-slate-500 mt-1.5">
            {isArabic
              ? "قم بتحديث معلوماتك الشخصية."
              : "Update your personal information."}
          </p>

        </div>


        <ProfileForm profile={profile} />

      </section>



      {/* Account Settings: Email + Security, unified cards */}
      <section className="px-8 md:px-10 pb-8 md:pb-10">

        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-5">
          {isArabic ? "إعدادات الحساب" : "Account Settings"}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">

          {/* Email card */}
          <div className="group rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-[#124b8a]/20 hover:shadow-md transition p-6 flex flex-col">

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#124b8a]/10 text-[#124b8a] flex items-center justify-center">
                <MailIcon />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {isArabic ? "البريد الإلكتروني" : "Email"}
              </h3>
            </div>

            <p className="text-slate-500 mb-5 text-sm" dir="ltr">
              {email}
            </p>

            <Link
              href="/change-email"
              className="mt-auto inline-flex justify-center bg-white border border-slate-200 text-[#124b8a] px-5 py-2.5 rounded-xl font-bold hover:bg-[#124b8a] hover:text-white hover:border-[#124b8a] transition"
            >
              {isArabic ? "تغيير البريد الإلكتروني" : "Change Email"}
            </Link>

          </div>


          {/* Security card */}
          <div className="group rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-[#124b8a]/20 hover:shadow-md transition p-6 flex flex-col">

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#124b8a]/10 text-[#124b8a] flex items-center justify-center">
                <LockIcon />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {isArabic ? "أمان الحساب" : "Account Security"}
              </h3>
            </div>

            <p className="text-slate-500 mb-5 text-sm">
              {isArabic
                ? "يمكنك تحديث كلمة المرور من هنا."
                : "Manage your password security."}
            </p>

            <Link
              href="/change-password"
              className="mt-auto inline-flex justify-center bg-white border border-slate-200 text-[#124b8a] px-5 py-2.5 rounded-xl font-bold hover:bg-[#124b8a] hover:text-white hover:border-[#124b8a] transition"
            >
              {isArabic ? "تغيير كلمة المرور" : "Change Password"}
            </Link>

          </div>

        </div>

      </section>






    </div>
  );
}
