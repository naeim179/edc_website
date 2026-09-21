"use client";

import { useCallback, useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type Props = {
  children: ReactNode;
  role: string | null;
  isAuthenticated: boolean;
  userName: string;
};

export default function AppShellClient({
  children,
  role,
  isAuthenticated,
  userName,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  return (
    <div className="app-shell flex min-h-screen gap-6 p-3 font-sans sm:p-4">
      <Sidebar
        role={role}
        isAuthenticated={isAuthenticated}
        open={menuOpen}
        onClose={closeMenu}
      />

      <main className="app-main min-w-0 flex-1 space-y-6 overflow-x-clip">
        <Topbar
          isAuthenticated={isAuthenticated}
          userName={userName}
          role={role}
          onMenuClick={openMenu}
        />

        {children}
      </main>
    </div>
  );
}
