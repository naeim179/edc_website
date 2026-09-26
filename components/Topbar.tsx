"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import DisplaySettings from "@/components/DisplaySettings";
import { useLanguage } from "@/components/LanguageProvider";
import {
  LogoutIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/icons";

type TopbarProps = {
  isAuthenticated: boolean;
  userName: string;
  role: string | null;
  /** يفتح القائمة الجانبية على الجوال */
  onMenuClick?: () => void;
};

export default function Topbar({
  isAuthenticated,
  userName,
  role,
  onMenuClick,
}: TopbarProps) {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [query, setQuery] = useState("");

  const isArabic = language === "ar";

  const roleLabel =
    role === "admin"
      ? t.topbar.admin
      : role === "student"
      ? t.topbar.student
      : role === "teacher"
      ? isArabic
        ? "مدرس"
        : "Teacher"
      : t.topbar.user;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
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
      className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex shrink-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={isArabic ? "فتح القائمة" : "Open menu"}
          aria-controls="app-sidebar"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        >
          <MenuIcon />
        </button>

        <Link
          href="/"
          aria-label="Your Way"
          className="rounded-xl border border-slate-200 bg-white p-1.5"
        >
          <Image
            src="/logo/logo-transparent.png"
            alt="Your Way"
            width={160}
            height={160}
            className="h-6 w-auto object-contain"
          />
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        role="search"
        className="order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1"
      >
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.topbar.search}
            aria-label={t.topbar.search}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pe-4 ps-11 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#124b8a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#124b8a]/10"
          />

          <button
            type="submit"
            aria-label={isArabic ? "بحث" : "Search"}
            className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#124b8a]"
          >
            <SearchIcon width={18} height={18} />
          </button>
        </div>
      </form>

      <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {isAuthenticated ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pe-1.5 ps-1.5 transition-colors hover:bg-slate-50 sm:pe-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#124b8a] text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>

              <span className="hidden min-w-0 flex-col text-start leading-tight sm:flex">
                <span className="max-w-[9rem] truncate text-sm font-bold text-slate-800">
                  {userName}
                </span>

                <span className="text-xs text-slate-500">
                  {roleLabel}
                </span>
              </span>
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                aria-label={t.topbar.logout}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:px-4"
              >
                <LogoutIcon width={18} height={18} />

                <span className="hidden sm:inline">
                  {t.topbar.logout}
                </span>
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="flex h-11 items-center rounded-xl bg-[#124b8a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0d3b6e]"
          >
            {t.topbar.login}
          </Link>
        )}

        <DisplaySettings />
      </div>
    </header>
  );
}
