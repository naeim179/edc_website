"use client";

import type { ReactNode } from "react";
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
  return (
    <div className="app-shell flex min-h-screen p-4 gap-6 font-sans">

      <Sidebar
        role={role}
        isAuthenticated={isAuthenticated}
      />

      <main className="app-main flex-1 min-w-0 space-y-6 overflow-hidden">

        <Topbar
          isAuthenticated={isAuthenticated}
          userName={userName}
          avatarUrl={avatarUrl}
          role={role}
        />

        {children}

      </main>

    </div>
  );
}
