"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SidebarProps = {
  role?: string | null;
  isAuthenticated?: boolean;
};

type AppLanguage = "ar" | "en";

export default function Sidebar({
  role = null,
  isAuthenticated = false,
}: SidebarProps) {
  const [language, setLanguage] =
    useState<AppLanguage>("ar");

  useEffect(() => {
    function syncLanguage() {
      setLanguage(
        document.documentElement.dataset.lang === "en"
          ? "en"
          : "ar"
      );
    }

    syncLanguage();

    window.addEventListener(
      "app-language-change",
      syncLanguage
    );

    return () => {
      window.removeEventListener(
        "app-language-change",
        syncLanguage
      );
    };
  }, []);

  const isAdmin = role === "admin";
  const isArabic = language === "ar";

  const text = isArabic
    ? {
        platform: "منصتي التعليمية",
        dashboard: "لوحة الإدارة",
        manageCourses: "إدارة الدورات",
        orders: "الطلبات",
        students: "الطلاب",
        profile: "الملف الشخصي",
        home: "الرئيسية",
        courses: "جميع الدورات",
        myCourses: "موادي",
      }
    : {
        platform: "My Learning Platform",
        dashboard: "Dashboard",
        manageCourses: "Manage Courses",
        orders: "Orders",
        students: "Students",
        profile: "Profile",
        home: "Home",
        courses: "All Courses",
        myCourses: "My Courses",
      };

  const linkClass =
    "block rounded-xl px-4 py-3 hover:bg-white/15 transition";

  return (
    <aside
      className="w-64 shrink-0 rounded-[22px] bg-gradient-to-b from-[#087a54] to-[#045f42] text-white p-6 min-h-[calc(100vh-2rem)]"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-bold">
          {text.platform}
        </h1>

        <span className="text-2xl">
          🎓
        </span>
      </div>

      <nav
        className={`space-y-2 ${
          isArabic ? "text-right" : "text-left"
        }`}
      >
        {isAdmin ? (
          <>
            <Link
              href="/admin"
              className={linkClass}
            >
              {text.dashboard}
            </Link>

            <Link
              href="/admin/courses"
              className={linkClass}
            >
              {text.manageCourses}
            </Link>

            <Link
              href="/admin/orders"
              className={linkClass}
            >
              {text.orders}
            </Link>

            <Link
              href="/admin/students"
              className={linkClass}
            >
              {text.students}
            </Link>

            <Link
              href="/profile"
              className={linkClass}
            >
              {text.profile}
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/"
              className={linkClass}
            >
              {text.home}
            </Link>

            <Link
              href="/courses"
              className={linkClass}
            >
              {text.courses}
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/my-courses"
                  className={linkClass}
                >
                  {text.myCourses}
                </Link>

                <Link
                  href="/profile"
                  className={linkClass}
                >
                  {text.profile}
                </Link>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
