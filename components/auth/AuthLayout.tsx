"use client";

import AuthLanguageSwitcher from "@/components/auth/AuthLanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import BrandLogo from "@/components/BrandLogo";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function AuthLayout({
  title,
  description,
  children,
}: AuthLayoutProps) {
  const { language } = useLanguage();
  return (
    <div
      className="yw-auth-page min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c] p-4"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md p-4 sm:p-8">
        <AuthLanguageSwitcher />

        <div className="mb-10 text-center">

          <div className="yw-auth-brand mx-auto mb-6 flex items-center justify-center sm:mb-8">

            <BrandLogo variant="auth" priority />

          </div>


          <h1 className="text-2xl font-bold text-white">
            {title}
          </h1>


          <p className="mt-2 text-sm text-white/70">
            {description}
          </p>

        </div>


        {children}

      </div>
    </div>
  );
}
