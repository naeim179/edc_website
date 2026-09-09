"use client";

import { useEffect, useState } from "react";

type AppLanguage = "ar" | "en";
type AppTheme = "light" | "dark" | "eye";

export default function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>("ar");
  const [theme, setTheme] = useState<AppTheme>("light");

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("app-language") === "en" ? "en" : "ar";

    const savedThemeValue = localStorage.getItem("app-theme");

    const savedTheme: AppTheme =
      savedThemeValue === "dark" || savedThemeValue === "eye"
        ? savedThemeValue
        : "light";

    setLanguage(savedLanguage);
    setTheme(savedTheme);

    const root = document.documentElement;

    root.lang = savedLanguage;
    root.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    root.dataset.lang = savedLanguage;
    root.dataset.theme = savedTheme;
  }, []);

  function changeLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);

    const root = document.documentElement;

    root.lang = nextLanguage;
    root.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    root.dataset.lang = nextLanguage;

    localStorage.setItem("app-language", nextLanguage);

    window.dispatchEvent(new Event("app-language-change"));
  }

  function changeTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);

    document.documentElement.dataset.theme = nextTheme;

    localStorage.setItem("app-theme", nextTheme);

    window.dispatchEvent(new Event("app-theme-change"));
  }

  const isArabic = language === "ar";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={isArabic ? "إعدادات العرض" : "Display settings"}
        title={isArabic ? "إعدادات العرض" : "Display settings"}
        className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg hover:border-emerald-300 transition"
      >
        ⚙️
      </button>

      {open && (
        <div
          className="absolute end-0 top-14 z-50 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-4"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <h3 className="font-bold text-slate-800 mb-4">
            {isArabic ? "إعدادات العرض" : "Display settings"}
          </h3>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-600">
              {isArabic ? "اللغة" : "Language"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => changeLanguage("ar")}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  language === "ar"
                    ? "bg-[#087a54] text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                العربية
              </button>

              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  language === "en"
                    ? "bg-[#087a54] text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-bold text-slate-600">
              {isArabic ? "المظهر" : "Appearance"}
            </p>

            <button
              type="button"
              onClick={() => changeTheme("light")}
              className={`w-full rounded-lg px-3 py-2 text-sm font-bold text-start transition ${
                theme === "light"
                  ? "bg-[#087a54] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              ☀️ {isArabic ? "الوضع النهاري" : "Light mode"}
            </button>

            <button
              type="button"
              onClick={() => changeTheme("dark")}
              className={`w-full rounded-lg px-3 py-2 text-sm font-bold text-start transition ${
                theme === "dark"
                  ? "bg-[#087a54] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              🌙 {isArabic ? "الوضع الليلي" : "Dark mode"}
            </button>

            <button
              type="button"
              onClick={() => changeTheme("eye")}
              className={`w-full rounded-lg px-3 py-2 text-sm font-bold text-start transition ${
                theme === "eye"
                  ? "bg-[#087a54] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              👁️ {isArabic ? "راحة العين" : "Eye comfort"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
