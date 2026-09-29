"use client";

import Link from "next/link";
import Image from "next/image";
import {
usePathname } from "next/navigation";
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
  MessageIcon,
} from "@/components/icons";

type SidebarProps = {
  role?: string | null;
  isAuthenticated?: boolean;
  /** للأدمن: هل هو سوبر أدمن؟ */
  isSuperAdmin?: boolean;
  /** صلاحيات الأدمن المقيّد. null = غير محددة، فتظهر كل الأقسام */
  permissions?: string[] | null;
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
  isSuperAdmin = false,
  permissions = null,
  open = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();

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

  const text = t.sidebar;

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
          label: text.payments,
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
                href: "/messages",
                label: text.messages,
                icon: <MessageIcon />,
              },
              {
                href: "/profile",
                label: text.profile,
                icon: <UserIcon />,
              },
            ]
          : []),
      ];

  const permissionByHref: Record<string, string> = {
    "/admin/courses": "manage_courses",
    "/admin/teachers": "manage_teachers",
    "/admin/orders": "view_orders",
    "/admin/students": "manage_students",
  };

  const visibleItems: NavItem[] = isAdmin
    ? items.filter((item) => {
        const needed = permissionByHref[item.href];
        if (!needed || isSuperAdmin || permissions === null) return true;
        return permissions.includes(needed);
      })
    : items;

  if (isAdmin && isSuperAdmin) {
    const at = visibleItems.findIndex((item) => item.href === "/profile");
    visibleItems.splice(at === -1 ? visibleItems.length : at, 0, {
      href: "/admin/staff",
      label: t.staff.navLabel,
      icon: <ShieldIcon />,
    });
  }

  const hiddenTransform = isArabic
    ? "translate-x-full"
    : "-translate-x-full";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="app-sidebar"
        dir={isArabic ? "rtl" : "ltr"}
        className={`yw-sidebar fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] transition-[transform,visibility] duration-300 motion-reduce:transition-none lg:sticky lg:inset-auto lg:top-5 lg:z-auto lg:h-[calc(100vh-2rem)] lg:w-72 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:self-start lg:visible ${
          open
            ? "visible translate-x-0"
            : `invisible ${hiddenTransform}`
        }`}
      >
        <div
          className="yw-sidebar-panel"
          style={{
            backgroundColor: "var(--brand-surface)",
            borderColor: "var(--brand-border)",
          }}
        >
          <div className="flex flex-col items-center justify-center gap-3 px-1 pb-6">
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "var(--brand-ink-soft)" }}
              >
                <Image
                  src="/logo/logo-transparent.png"
                  alt="Your Way"
                  width={80}
                  height={80}
                  className="h-10 w-10 object-contain"
                />
              </div>

              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--brand-text)" }}
              >
                {text.platform}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={text.close}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden"
              style={{ color: "var(--brand-text-faint)" }}
            >
              <CloseIcon />
            </button>
          </div>

          <div
            className="mb-2 h-px"
            style={{ backgroundColor: "var(--brand-border-soft)" }}
          />

          <nav
            aria-label={text.menu}
            className="yw-sidebar-nav"
          >
            {visibleItems.map((item) => {
              const active = isActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className="yw-sidebar-link"
                  style={{
                    backgroundColor: active
                      ? "var(--brand-ink-soft)"
                      : "transparent",
                    color: active
                      ? "var(--brand-ink)"
                      : "var(--brand-text-muted)",
                  }}
                >
                  <span
                    style={{
                      color: active
                        ? "var(--brand-ink)"
                        : "var(--brand-text-faint)",
                    }}
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

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
