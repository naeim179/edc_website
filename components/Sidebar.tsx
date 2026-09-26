"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  BookIcon,
  CapIcon,
  CloseIcon,
  DashboardIcon,
  HomeIcon,
  ReceiptIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

type SidebarProps = {
  role?: string | null;
  isAuthenticated?: boolean;
  /** يستخدم فقط على الجوال (القائمة المنزلقة) */
  open?: boolean;
  onClose?: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return (
    pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

export default function Sidebar({
  role = null,
  isAuthenticated = false,
  open = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { language } = useLanguage();

  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const isArabic = language === "ar";

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const media = window.matchMedia("(min-width: 1024px)");

    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onMediaChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMediaChange);
    };
  }, [open, onClose]);

  const text = isArabic
    ? {
        platform: "Your Way",
        dashboard: "لوحة الإدارة",
        manageCourses: "إدارة الدورات",
        teachers: "المعلمون",
        orders: "المدفوعات",
        students: "الطلاب",
        profile: "الملف الشخصي",
        teacherDashboard: "لوحة المعلم",
        teacherProfile: "ملف المدرس",
        home: "الرئيسية",
        courses: "جميع الدورات",
        myCourses: "موادي",
        menu: "القائمة الرئيسية",
        close: "إغلاق القائمة",
      }
    : {
        platform: "Your Way",
        dashboard: "Dashboard",
        manageCourses: "Manage Courses",
        teachers: "Teachers",
        orders: "Payments",
        students: "Students",
        profile: "Profile",
        teacherDashboard: "Teacher Dashboard",
        teacherProfile: "Teacher Profile",
        home: "Home",
        courses: "All Courses",
        myCourses: "My Courses",
        menu: "Main navigation",
        close: "Close menu",
      };

  const items: NavItem[] = isAdmin
    ? [
        {
          href: "/admin",
          label: text.dashboard,
          icon: <DashboardIcon />,
          exact: true,
        },
        {
          href: "/admin/courses",
          label: text.manageCourses,
          icon: <BookIcon />,
        },
        {
          href: "/admin/teachers",
          label: text.teachers,
          icon: <CapIcon />,
        },
        {
          href: "/admin/orders",
          label: text.orders,
          icon: <ReceiptIcon />,
        },
        {
          href: "/admin/students",
          label: text.students,
          icon: <UsersIcon />,
        },
        {
          href: "/profile",
          label: text.profile,
          icon: <UserIcon />,
        },
      ]
    : isTeacher
    ? [
        {
          href: "/teacher/courses",
          label: text.teacherDashboard,
          icon: <DashboardIcon />,
        },
        {
          href: "/teacher/profile",
          label: text.teacherProfile,
          icon: <CapIcon />,
        },
        {
          href: "/profile",
          label: text.profile,
          icon: <UserIcon />,
        },
      ]
    : [
        {
          href: "/",
          label: text.home,
          icon: <HomeIcon />,
          exact: true,
        },
        {
          href: "/courses",
          label: text.courses,
          icon: <BookIcon />,
        },
        ...(isAuthenticated
          ? [
              {
                href: "/my-courses",
                label: text.myCourses,
                icon: <CapIcon />,
              },
              {
                href: "/profile",
                label: text.profile,
                icon: <UserIcon />,
              },
            ]
          : []),
      ];

  const hiddenTransform = isArabic
    ? "translate-x-full"
    : "-translate-x-full";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="app-sidebar"
        dir={isArabic ? "rtl" : "ltr"}
        className={`fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] transition-[transform,visibility] duration-300 motion-reduce:transition-none lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:h-[calc(100vh-2rem)] lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:self-start lg:visible ${
          open
            ? "visible translate-x-0"
            : `invisible ${hiddenTransform}`
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto border border-slate-200 bg-white p-4 shadow-sm lg:rounded-2xl">
          <div className="flex items-center justify-between px-1 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                <Image
                  src="/logo/logo-transparent.png"
                  alt="Your Way"
                  width={80}
                  height={80}
                  className="h-7 w-7 object-contain"
                />
              </div>

              <span className="text-base font-bold tracking-tight text-slate-800">
                {text.platform}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={text.close}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 lg:hidden"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mb-2 h-px bg-slate-100" />

          <nav
            aria-label={text.menu}
            className="mt-2 flex flex-col gap-0.5"
          >
            {items.map((item) => {
              const active = isActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#124b8a]/8 text-[#124b8a]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span
                    className={
                      active ? "text-[#124b8a]" : "text-slate-400"
                    }
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
