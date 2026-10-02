"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  EyeIcon,
  GlobeIcon,
  MoonIcon,
  SlidersIcon,
  SunIcon,
} from "@/components/icons";

type AppTheme = "light" | "dark" | "eye";

const THEMES: {
  id: AppTheme;
  icon: ReactNode;
  ar: string;
  en: string;
}[] = [
  { id: "light", icon: <SunIcon />, ar: "فاتح", en: "Light" },
  { id: "dark", icon: <MoonIcon />, ar: "داكن", en: "Dark" },
  {
    id: "eye",
    icon: <EyeIcon />,
    ar: "مريح للعين",
    en: "Eye comfort",
  },
];

function isTheme(value: string | null | undefined): value is AppTheme {
  return value === "light" || value === "dark" || value === "eye";
}

function readCurrentTheme(): AppTheme {
  const current = document.documentElement.dataset.theme;

  return isTheme(current) ? current : "light";
}

function saveTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;

  document.cookie = `app-theme=${theme}; path=/; max-age=31536000; samesite=lax`;

  try {
    localStorage.setItem("app-theme", theme);
  } catch {
    // التخزين المحلي غير متاح (وضع خاص مثلاً)
  }
}

export default function DisplaySettings() {
  const { language, changeLanguage } = useLanguage();

  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>("light");

  const containerRef = useRef<HTMLDivElement>(null);

  const isArabic = language === "ar";

  // مستخدمون قدامى حفظوا الثيم بالتخزين المحلي فقط: نطبقه مرة ونحفظه بالكوكي
  useEffect(() => {
    try {
      const saved = localStorage.getItem("app-theme");

      if (isTheme(saved) && saved !== readCurrentTheme()) {
        saveTheme(saved);
      }
    } catch {
      // تجاهل
    }
  }, []);

  // إغلاق النافذة بالضغط خارجها أو بزر Esc
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function togglePanel() {
    if (!open) {
      setTheme(readCurrentTheme());
    }

    setOpen((value) => !value);
  }

  function changeTheme(next: AppTheme) {
    setTheme(next);
    saveTheme(next);
  }

  const segment = (active: boolean) =>
    `flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      active ? "text-white" : "hover:opacity-80"
    }`;

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label={
          isArabic ? "إعدادات العرض" : "Display settings"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-xl border transition-colors"
        style={{
          borderColor: "var(--brand-border)",
          backgroundColor: "var(--brand-ink)",
          color: "#ffffff",
        }}
      >
        <SlidersIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={
            isArabic ? "إعدادات العرض" : "Display settings"
          }
          dir={isArabic ? "rtl" : "ltr"}
          className="absolute end-0 top-full z-[200] mt-2 max-h-[calc(100dvh-5rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border p-4 shadow-xl"
          style={{
            borderColor: "var(--brand-border)",
            backgroundColor: "var(--brand-surface)",
          }}
        >
          <p
            className="mb-2 flex items-center gap-2 text-sm font-bold"
            style={{ color: "var(--brand-text)" }}
          >
            <GlobeIcon width={16} height={16} />
            {isArabic ? "اللغة" : "Language"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeLanguage("ar")}
              aria-pressed={language === "ar"}
              className={segment(language === "ar")}
              style={
                language === "ar"
                  ? { backgroundColor: "var(--brand-ink)" }
                  : {
                      backgroundColor: "var(--brand-bg)",
                      color: "var(--brand-text-muted)",
                    }
              }
            >
              العربية
            </button>

            <button
              type="button"
              onClick={() => changeLanguage("en")}
              aria-pressed={language === "en"}
              className={segment(language === "en")}
              style={
                language === "en"
                  ? { backgroundColor: "var(--brand-ink)" }
                  : {
                      backgroundColor: "var(--brand-bg)",
                      color: "var(--brand-text-muted)",
                    }
              }
            >
              English
            </button>
          </div>

          <p
            className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold"
            style={{ color: "var(--brand-text)" }}
          >
            <SunIcon width={16} height={16} />
            {isArabic ? "المظهر" : "Appearance"}
          </p>

          <div className="grid grid-cols-1 gap-2">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeTheme(item.id)}
                aria-pressed={theme === item.id}
                className={segment(theme === item.id)}
                style={
                  theme === item.id
                    ? { backgroundColor: "var(--brand-ink)" }
                    : {
                        backgroundColor: "var(--brand-bg)",
                        color: "var(--brand-text-muted)",
                      }
                }
              >
                {item.icon}
                {isArabic ? item.ar : item.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
