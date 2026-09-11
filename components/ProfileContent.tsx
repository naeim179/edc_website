"use client";

import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { useLanguage } from "@/components/LanguageProvider";

type ProfileContentProps = {
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null;
  };
  email: string;
};

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


  return (
    <div
      className="max-w-5xl mx-auto w-full bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="p-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          <div className="flex items-center gap-5">

            {profile.avatar_url ? (

              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border border-slate-200"
              />

            ) : (

              <div className="w-24 h-24 rounded-full bg-blue-50 text-[#1f5aa6] flex items-center justify-center text-4xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>

            )}


            <div className="text-right">

              <h1 className="text-3xl font-bold text-slate-800">
                {displayName}
              </h1>

              <p
                className="text-slate-500 mt-1"
                dir="ltr"
              >
                {email}
              </p>

              <span className="inline-block mt-3 px-4 py-1 rounded-full bg-blue-50 text-[#1f5aa6] text-sm font-bold">
                {roleLabel}
              </span>

            </div>

          </div>


          <Link
            href="/my-courses"
            className="bg-[#1f5aa6] text-white px-6 py-3 rounded-xl font-bold text-center"
          >
            {isArabic ? "دوراتي التعليمية" : "My Courses"}
          </Link>

        </div>

      </section>


      <div className="border-t border-slate-100" />


      <div className="flex gap-8 px-8 pt-6 text-sm font-bold">

        <button className="text-[#1f5aa6] border-b-2 border-[#1f5aa6] pb-3">
          {isArabic ? "الملف الشخصي" : "Profile"}
        </button>

        <button className="text-slate-400 pb-3">
          {isArabic ? "إعدادات الحساب" : "Account Settings"}
        </button>

      </div>


      <section className="p-8">

        <div className="mb-6 text-right">

          <h2 className="text-2xl font-bold text-slate-800">
            {isArabic ? "تعديل البيانات" : "Edit Information"}
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {isArabic
              ? "حدّث معلومات حسابك الشخصية."
              : "Update your personal account information."}
          </p>

        </div>


        <ProfileForm profile={profile} />

      </section>


    </div>
  );
}
