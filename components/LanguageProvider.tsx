"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  translations,
  type Language,
} from "@/lib/i18n";

type LanguageContextType = {
  language: Language;
  t: typeof translations.ar;
  changeLanguage: (language: Language) => void;
  mounted: boolean;
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

function isLanguage(value: string | null | undefined): value is Language {
  return value === "ar" || value === "en";
}

// يطبّق اللغة على الصفحة ويحفظها بالكوكي (ليقرأها السيرفر) وبالتخزين المحلي
function applyLanguage(next: Language) {
  const root = document.documentElement;

  root.lang = next;
  root.dir = next === "ar" ? "rtl" : "ltr";
  root.dataset.lang = next;

  document.cookie = `app-language=${next}; path=/; max-age=31536000; samesite=lax`;

  try {
    localStorage.setItem("app-language", next);
  } catch {
    // التخزين المحلي غير متاح
  }
}

export function LanguageProvider({
  children,
  initialLanguage = "ar",
}: {
  children: ReactNode;
  /** اللغة المقروءة من الكوكي على السيرفر، حتى لا يحصل وميض أو عدم تطابق */
  initialLanguage?: Language;
}) {
  const [language, setLanguage] =
    useState<Language>(initialLanguage);

  // مستخدمون قدامى حفظوا اللغة بالتخزين المحلي فقط: نطبقها مرة واحدة
  useEffect(() => {
    try {
      const saved = localStorage.getItem("app-language");

      if (isLanguage(saved) && saved !== initialLanguage) {
        setLanguage(saved);
        applyLanguage(saved);
      }
    } catch {
      // تجاهل
    }
  }, [initialLanguage]);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    applyLanguage(nextLanguage);
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        t: translations[language],
        changeLanguage,
        mounted: true,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
