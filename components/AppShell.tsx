import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen bg-[#f4f7f6] p-4 gap-6 font-sans"
      dir="rtl"
    >
      <Sidebar />

      <main className="flex-1 min-w-0 space-y-6 overflow-hidden">
        <Topbar />

        {children}
      </main>
    </div>
  );
}
