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
      className="yw-shell"
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
        className="yw-main"
      >

        <div className="yw-topbar-wrap">
        <Topbar
          isAuthenticated={isAuthenticated}
          userName={userName}
          role={role}
          avatarUrl={avatarUrl}
          onMenuClick={openMenu}
        />
      </div>


        <section
          className="yw-content"
        >
          {children}
        </section>


      </main>

    </div>
  );
}
