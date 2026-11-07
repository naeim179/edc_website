"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { GlobeIcon } from "@/components/icons";

export default function AuthLanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();
  return (
    <div className="yw-auth-language" role="group" aria-label={language === "ar" ? "اللغة" : "Language"}>
      <GlobeIcon width={18} height={18} />
      <span>{language === "ar" ? "اللغة" : "Language"}</span>
      <button type="button" lang="ar" aria-pressed={language === "ar"} onClick={() => changeLanguage("ar")}>العربية</button>
      <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>English</button>
    </div>
  );
}
