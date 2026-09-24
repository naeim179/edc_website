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



  return (
    <div
      className="max-w-5xl mx-auto w-full bg-white rounded-[32px] border border-slate-100 shadow-lg overflow-hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >


      {/* User Header */}
      <section className="p-8 bg-gradient-to-br from-white to-blue-50/40">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">


          <div className="flex items-center gap-5">


            <div className="relative">

              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#124b8a] to-[#d6b56c] p-[3px]">

                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-5xl font-black text-[#124b8a]">
                  {avatar}
                </div>

              </div>

            </div>



            <div className="text-right">

              <h1 className="text-3xl font-bold text-slate-800">
                {displayName}
              </h1>


              <p
                className="text-slate-500 mt-2"
                dir="ltr"
              >
                {email}
              </p>


              <span className="inline-flex mt-3 px-4 py-1.5 rounded-full bg-blue-100 text-[#124b8a] text-sm font-bold">
                {roleLabel}
              </span>


            </div>


          </div>



          {profile.role === "student" && (
            <Link
              href="/my-courses"
              className="bg-[#124b8a] hover:bg-[#0d3b6e] text-white px-7 py-3 rounded-xl font-bold transition text-center shadow-sm"
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
      <div className="px-8 pt-6 text-sm font-bold">

        <button className="text-[#124b8a] border-b-2 border-[#124b8a] pb-3">
          {isArabic ? "الملف الشخصي" : "Profile"}
        </button>

      </div>



      {/* Form */}
      <section className="p-8">

        <div className="mb-6">

          <h2 className="text-2xl font-bold text-slate-800">
            {isArabic
              ? "معلومات الحساب"
              : "Account Information"}
          </h2>


          <p className="text-sm text-slate-500 mt-2">
            {isArabic
              ? "قم بتحديث معلوماتك الشخصية."
              : "Update your personal information."}
          </p>

        </div>


        <ProfileForm profile={profile} />


        <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-6">

          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {isArabic ? "البريد الإلكتروني" : "Email"}
          </h3>

          <p className="text-slate-500 mb-4" dir="ltr">
            {email}
          </p>

          <Link
            href="/change-email"
            className="inline-block bg-white border border-slate-200 text-[#124b8a] px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition"
          >
            {isArabic ? "تغيير البريد الإلكتروني" : "Change Email"}
          </Link>

        </div>


      </section>



      {/* Security */}
      <section className="mx-8 mb-8 rounded-2xl border border-slate-100 bg-slate-50 p-6">

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          {isArabic
            ? "أمان الحساب"
            : "Account Security"}
        </h3>


        <p className="text-sm text-slate-500 mb-5">
          {isArabic
            ? "يمكنك تحديث كلمة المرور من هنا."
            : "Manage your password security."}
        </p>


        <Link
          href="/change-password"
          className="inline-block bg-white border border-slate-200 text-[#124b8a] px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition"
        >
          {isArabic
            ? "تغيير كلمة المرور"
            : "Change Password"}
        </Link>


      </section>



      {/* Learning Stats Placeholder */}
      <section className="mx-8 mb-8 grid md:grid-cols-3 gap-4">


        {[
          {
            title: isArabic
              ? "الدورات المسجلة"
              : "Enrolled Courses",
            value: "0",
          },
          {
            title: isArabic
              ? "الدروس المكتملة"
              : "Completed Lessons",
            value: "0",
          },
          {
            title: isArabic
              ? "نسبة الإنجاز"
              : "Progress",
            value: "0%",
          },
        ].map((item) => (

          <div
            key={item.title}
            className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 text-center"
          >

            <p className="text-sm text-slate-500">
              {item.title}
            </p>

            <p className="text-3xl font-black text-[#124b8a] mt-2">
              {item.value}
            </p>

          </div>

        ))}


      </section>


    </div>
  );
}
