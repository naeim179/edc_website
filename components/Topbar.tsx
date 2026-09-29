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
  avatarUrl: string | null;
  /** يفتح القائمة الجانبية على الجوال */
  onMenuClick?: () => void;
};

export default function Topbar({
  isAuthenticated,
  userName,
  role,
  avatarUrl,
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
      className="yw-topbar flex w-full flex-wrap items-center gap-3 sm:flex-nowrap"
      style={{
        backgroundColor: "var(--brand-surface)",
        borderColor: "var(--brand-border)",
      }}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex shrink-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={isArabic ? "فتح القائمة" : "Open menu"}
          aria-controls="app-sidebar"
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-2xl
            border
            transition-all
            hover:shadow-md
          "
          style={{
            borderColor: "var(--brand-border)",
            color: "var(--brand-text-muted)",
          }}
        >
          <MenuIcon />
        </button>

        <Link
          href="/"
          aria-label="Your Way"
          className="rounded-xl border p-1.5"
          style={{ borderColor: "var(--brand-border)" }}
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
            className="
              h-12
              w-full
              rounded-2xl
              border
              pe-4
              ps-11
              text-sm
              outline-none
              transition
              focus:ring-4
            "
            style={{
              borderColor: "var(--brand-border)",
              backgroundColor: "var(--brand-bg)",
              color: "var(--brand-text)",
            }}
          />

          <button
            type="submit"
            aria-label={isArabic ? "بحث" : "Search"}
            className="absolute start-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "var(--brand-text-faint)" }}
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
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                border
                py-1.5
                pe-1.5
                ps-1.5
                transition-all
                hover:shadow-md
                sm:pe-4
              "
              style={{ borderColor: "var(--brand-border)" }}
            >
              <span
                className="flex h-9 w-9 overflow-hidden items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: "var(--brand-ink)" }}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </span>

              <span className="hidden min-w-0 flex-col text-start leading-tight sm:flex">
                <span
                  className="max-w-[9rem] truncate text-sm font-bold"
                  style={{ color: "var(--brand-text)" }}
                >
                  {userName}
                </span>

                <span
                  className="text-xs"
                  style={{ color: "var(--brand-text-faint)" }}
                >
                  {roleLabel}
                </span>
              </span>
            </Link>

            <form
              action={signOut}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  isArabic
                    ? "هل أنت متأكد أنك تريد تسجيل الخروج؟"
                    : "Are you sure you want to sign out?"
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                aria-label={t.topbar.logout}
                className="
                  flex
                  h-11
                  items-center
                  gap-2
                  rounded-2xl
                  border
                  px-3
                  text-sm
                  font-semibold
                  transition-all
                  hover:shadow-md
                  sm:px-4
                "
                style={{
                  borderColor: "var(--brand-border)",
                  color: "var(--brand-text-muted)",
                }}
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
            className="flex h-11 items-center rounded-xl px-5 text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: "var(--brand-ink)" }}
          >
            {t.topbar.login}
          </Link>
        )}

        <DisplaySettings />
      </div>
    </header>
  );
}
