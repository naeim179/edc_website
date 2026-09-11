"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type AppTheme = "light" | "dark" | "eye";

export default function DisplaySettings() {
  const { language, changeLanguage } =
    useLanguage();

  const [open, setOpen] =
    useState(false);

  const [theme, setTheme] =
    useState<AppTheme>("light");


  function changeTheme(
    nextTheme: AppTheme
  ) {
    setTheme(nextTheme);

    localStorage.setItem(
      "app-theme",
      nextTheme
    );

    document.documentElement.dataset.theme =
      nextTheme;
  }


  const isArabic =
    language === "ar";


  return (
    <div className="relative">

      <button
        type="button"
        onClick={() =>
          setOpen((v) => !v)
        }
        className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center"
      >
        ⚙️
      </button>


      {open && (
        <div
          className="absolute end-0 top-14 z-50 w-72 rounded-2xl bg-white border shadow-xl p-4"
          dir={isArabic ? "rtl" : "ltr"}
        >

          <h3 className="font-bold mb-4">
            {isArabic
              ? "إعدادات العرض"
              : "Display settings"}
          </h3>


          <div className="grid grid-cols-2 gap-2">

            <button
              onClick={() =>
                changeLanguage("ar")
              }
              className={`rounded-lg px-3 py-2 font-bold ${
                language === "ar"
                  ? "bg-[#087a54] text-white"
                  : "bg-slate-100"
              }`}
            >
              العربية
            </button>


            <button
              onClick={() =>
                changeLanguage("en")
              }
              className={`rounded-lg px-3 py-2 font-bold ${
                language === "en"
                  ? "bg-[#087a54] text-white"
                  : "bg-slate-100"
              }`}
            >
              English
            </button>

          </div>


          <div className="mt-5 space-y-2">

            <button
              onClick={() =>
                changeTheme("light")
              }
              className="w-full bg-slate-100 rounded-lg px-3 py-2"
            >
              ☀️ Light
            </button>


            <button
              onClick={() =>
                changeTheme("dark")
              }
              className="w-full bg-slate-100 rounded-lg px-3 py-2"
            >
              🌙 Dark
            </button>


            <button
              onClick={() =>
                changeTheme("eye")
              }
              className="w-full bg-slate-100 rounded-lg px-3 py-2"
            >
              👁 Eye comfort
            </button>

          </div>

        </div>
      )}

    </div>
  );
}
