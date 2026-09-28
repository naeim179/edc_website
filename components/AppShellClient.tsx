"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type Props = {
  children: ReactNode;
  role: string | null;
  isAuthenticated: boolean;
  userName: string;
  avatarUrl: string | null;
};

export default function AppShellClient({
  children,
  role,
  isAuthenticated,
  userName,
  avatarUrl,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  return (
    <div
      className="min-h-screen bg-[#F5F1EA] text-[#1F1F1F] flex gap-6 p-3 sm:p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Sidebar
        role={role}
        isAuthenticated={isAuthenticated}
        open={menuOpen}
        onClose={closeMenu}
      />

      <main className="flex-1 min-w-0 space-y-6 overflow-x-clip">
        <Topbar
          isAuthenticated={isAuthenticated}
          userName={userName}
          role={role}
          avatarUrl={avatarUrl}
          onMenuClick={openMenu}
        />

        {children}
      </main>
    </div>
  );
}
