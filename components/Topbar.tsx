"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import DisplaySettings from "@/components/DisplaySettings";

type TopbarProps = {
  isAuthenticated: boolean;
  userName: string;
  avatarUrl: string | null;
  role: string | null;
};

type AppLanguage = "ar" | "en";

export default function Topbar({
  isAuthenticated,
  userName,
  avatarUrl,
  role,
}: TopbarProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [language, setLanguage] =
    useState<AppLanguage>("ar");

  useEffect(() => {
    function syncLanguage() {
      setLanguage(
        document.documentElement.dataset.lang === "en"
          ? "en"
          : "ar"
      );
    }

    syncLanguage();

    window.addEventListener(
      "app-language-change",
      syncLanguage
    );

    return () => {
      window.removeEventListener(
        "app-language-change",
        syncLanguage
      );
    };
  }, []);

  const isArabic = language === "ar";

  const text = isArabic
    ? {
        admin: "مدير المنصة",
        student: "طالب",
        user: "حساب المستخدم",
        logout: "تسجيل الخروج",
        login: "تسجيل الدخول",
        search: "ابحث عن دورة، تصنيف أو مدرب...",
        searchLabel: "بحث",
      }
    : {
        admin: "Platform Admin",
        student: "Student",
        user: "User Account",
        logout: "Log out",
        login: "Log in",
        search: "Search courses, categories or instructors...",
        searchLabel: "Search",
      };

  const roleLabel =
    role === "admin"
      ? text.admin
      : role === "student"
        ? text.student
        : text.user;

  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push("/courses");
      return;
    }

    router.push(
      `/courses?q=${encodeURIComponent(trimmedQuery)}`
    );
  }

  return (
    <header
      className="w-full flex items-center justify-between gap-4 py-2 px-1"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 bg-white p-2 px-3 rounded-[14px] shadow-sm border border-slate-100 hover:border-emerald-200 transition"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#087a54] flex items-center justify-center font-bold">
                  {userName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div
                className={`flex flex-col ${
                  isArabic
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <span className="text-[15px] font-bold text-slate-800">
                  {userName}
                </span>

                <span className="text-[12px] text-slate-500">
                  {roleLabel}
                </span>
              </div>
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:text-red-600 hover:border-red-200 transition"
              >
                {text.logout}
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="h-11 flex items-center px-5 rounded-xl bg-[#087a54] text-white text-sm font-bold"
          >
            {text.login}
          </Link>
        )}

        <DisplaySettings />
      </div>

      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-md"
        role="search"
      >
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={text.search}
            className={`w-full h-11 bg-white text-slate-700 text-[14px] rounded-[14px] border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#087a54]/20 transition-all ${
              isArabic
                ? "pr-11 pl-4 text-right"
                : "pl-11 pr-4 text-left"
            }`}
          />

          <button
            type="submit"
            aria-label={text.searchLabel}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#087a54] transition-colors ${
              isArabic ? "right-3.5" : "left-3.5"
            }`}
          >
            🔍
          </button>
        </div>
      </form>
    </header>
  );
}
