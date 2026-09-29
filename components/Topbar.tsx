"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
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

            <form action={signOut}>
              <LogoutConfirmation
                isArabic={isArabic}
                label={t.topbar.logout}
              />
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

function LogoutConfirmation({
  isArabic,
  label,
}: {
  isArabic: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label={label}
        aria-haspopup="dialog"
        className="flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-all hover:shadow-md disabled:cursor-wait disabled:opacity-60 sm:px-4"
        style={{
          borderColor: "var(--brand-border)",
          color: "var(--brand-text-muted)",
        }}
      >
        <LogoutIcon width={18} height={18} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      <dialog
        ref={dialogRef}
        dir={isArabic ? "rtl" : "ltr"}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={pending}
        onClose={(event) => {
          if (!event.currentTarget.open) setOpen(false);
        }}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (pending || event.target !== event.currentTarget) return;

          const rect = event.currentTarget.getBoundingClientRect();
          const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;

          if (outside) setOpen(false);
        }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-3xl border p-6 text-start shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
          color: "var(--brand-text)",
        }}
      >
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: "var(--brand-ink-soft)",
            color: "var(--brand-ink)",
          }}
        >
          <LogoutIcon width={26} height={26} />
        </div>

        <h2 id={titleId} className="text-xl font-bold">
          {isArabic ? "تسجيل الخروج؟" : "Sign out?"}
        </h2>

        <p
          id={descriptionId}
          className="mt-3 text-sm leading-7"
          style={{ color: "var(--brand-text-muted)" }}
        >
          {isArabic
            ? "هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟"
            : "Are you sure you want to sign out of your account?"}
        </p>

        <div className="mt-7 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
            style={{
              backgroundColor: "var(--brand-bg)",
              borderColor: "var(--brand-border)",
              color: "var(--brand-text)",
            }}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>

          <button
            type="submit"
            disabled={pending}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            style={{ backgroundColor: "var(--hero-start)" }}
          >
            <span aria-live="polite">
              {pending
                ? isArabic
                  ? "جارٍ تسجيل الخروج..."
                  : "Signing out..."
                : label}
            </span>
          </button>
        </div>
      </dialog>
    </>
  );
}
