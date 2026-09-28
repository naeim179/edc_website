"use client";

import {
  useCallback,
  useState,
  type ReactNode,
} from "react";

import { useLanguage } from "@/components/LanguageProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type Props = {
  children: ReactNode;
  role: string | null;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[] | null;
  userName: string;
  avatarUrl: string | null;
};

export default function AppShellClient({
  children,
  role,
  isAuthenticated,
  isSuperAdmin = false,
  permissions = null,
  userName,
  avatarUrl,
}: Props) {

  const [menuOpen,setMenuOpen] =
    useState(false);

  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";


  const closeMenu =
    useCallback(
      () => setMenuOpen(false),
      []
    );


  const openMenu =
    useCallback(
      () => setMenuOpen(true),
      []
    );


  return (
    <div
      dir={isArabic ? "rtl":"ltr"}
      className="
        min-h-screen
        bg-[#f4f8f6]
        text-slate-900
        flex
        gap-5
        p-3
        md:p-5
      "
    >

      <Sidebar
        role={role}
        isAuthenticated={isAuthenticated}
        isSuperAdmin={isSuperAdmin}
        permissions={permissions}
        open={menuOpen}
        onClose={closeMenu}
      />


      <main
        className="
          flex-1
          min-w-0
          flex
          flex-col
          gap-5
        "
      >

        <div className="relative z-[100]">
        <Topbar
          isAuthenticated={isAuthenticated}
          userName={userName}
          role={role}
          avatarUrl={avatarUrl}
          onMenuClick={openMenu}
        />
      </div>


        <section
          className="
            min-h-[calc(100vh-120px)]
            rounded-3xl
            bg-white/70
            border
            border-slate-200
            p-4
            md:p-6
            shadow-sm
            relative
            z-0
          "
        >
          {children}
        </section>


      </main>

    </div>
  );
}
