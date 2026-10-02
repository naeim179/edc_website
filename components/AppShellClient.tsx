"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useLanguage } from "@/components/LanguageProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
  role: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  isSuperAdmin?: boolean;
  permissions?: string[] | null;
  userName: string;
  avatarUrl: string | null;
};

export default function AppShellClient({
  children,
  role,
  isAuthenticated,
  userId,
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


  // presence-heartbeat
  useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase =
      createClient();

    let stopped =
      false;

    async function heartbeat() {
      if (stopped) {
        return;
      }

      const {
        error,
      } = await supabase
        .from(
          "user_presence"
        )
        .upsert(
          {
            user_id:
              userId,

            last_seen:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (error) {
        console.error(
          "Presence heartbeat failed:",
          error.message
        );
      }
    }

    void heartbeat();

    const timer =
      window.setInterval(
        () => {
          void heartbeat();
        },
        30000
      );

    const onFocus =
      () => {
        void heartbeat();
      };

    const onVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void heartbeat();
        }
      };

    window.addEventListener(
      "focus",
      onFocus
    );

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () => {
      stopped = true;

      window.clearInterval(
        timer
      );

      window.removeEventListener(
        "focus",
        onFocus
      );

      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
    };
  }, [
    userId,
  ]);


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
