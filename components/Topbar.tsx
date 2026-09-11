"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import DisplaySettings from "@/components/DisplaySettings";
import { useLanguage } from "@/components/LanguageProvider";


type TopbarProps = {
  isAuthenticated: boolean;
  userName: string;
  avatarUrl: string | null;
  role: string | null;
};


export default function Topbar({
  isAuthenticated,
  userName,
  avatarUrl,
  role,
}: TopbarProps) {

  const router = useRouter();

  const { language, t } =
    useLanguage();


  const [query, setQuery] =
    useState("");


  const isArabic =
    language === "ar";


  const roleLabel =
    role === "admin"
      ? t.topbar.admin
      : role === "student"
        ? t.topbar.student
        : t.topbar.user;


  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuery =
      query.trim();


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


      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-md"
      >

        <div className="relative">

          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={t.topbar.search}
            className={`w-full h-11 bg-white text-slate-700 text-[14px] rounded-[14px] border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              isArabic
                ? "pr-11 pl-4 text-right"
                : "pl-11 pr-4 text-left"
            }`}
          />


          <button
            type="submit"
            aria-label="search"
            className={`absolute top-1/2 -translate-y-1/2 ${
              isArabic
                ? "right-3.5"
                : "left-3.5"
            }`}
          >
            🔍
          </button>

        </div>

      </form>



      <div className="flex items-center gap-3">


        {isAuthenticated ? (

          <>

            <Link
              href="/profile"
              className="flex items-center gap-3 bg-white p-2 px-3 rounded-[14px] shadow-sm border border-slate-100"
            >

              {avatarUrl ? (

                <img
                  src={avatarUrl}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover"
                />

              ) : (

                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#124b8a] flex items-center justify-center font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>

              )}


              <div className="flex flex-col text-right">

                <span className="text-[15px] font-bold">
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
                className="h-11 px-4 rounded-xl bg-white border text-sm font-bold"
              >
                {t.topbar.logout}
              </button>

            </form>

          </>

        ) : (

          <Link
            href="/login"
            className="h-11 flex items-center px-5 rounded-xl bg-[#124b8a] text-white text-sm font-bold"
          >
            {t.topbar.login}
          </Link>

        )}


        <DisplaySettings />


      </div>

    </header>

  );
}
