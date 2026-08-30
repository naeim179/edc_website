'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navLinkClass = (href: string) => {
    const isActive =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);

    return `h-[46px] border-0 rounded-[10px] text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right transition-all ${
      isActive
        ? "bg-white/20"
        : "bg-transparent hover:bg-white/10"
    }`;
  };

  return (
    <aside className="rtl flex flex-col min-h-[calc(100vh-2rem)] p-[15px_16px_17px] rounded-[16px] text-white bg-[radial-gradient(circle_at_70%_35%,rgba(26,154,111,0.32),transparent_42%),linear-gradient(180deg,#076b4a_0%,#087a54_54%,#066b49_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      {/* Logo */}
      <div className="h-[55px] flex ltr items-center justify-between px-[3px] mb-[7px]">
        <div className="flex ltr items-center gap-[10px] text-[17px] font-bold whitespace-nowrap">
          <svg
            className="w-[34px] h-[34px] fill-white stroke-white stroke-[1.1]"
            viewBox="0 0 64 48"
          >
            <path d="M4 15 32 2l28 13-28 13z" />
            <path
              d="M14 21v13c9 8 27 8 36 0V21"
              fill="none"
              strokeWidth="4"
            />
            <path d="M58 17v17" fill="none" strokeWidth="4" />
            <circle cx="58" cy="36" r="3" />
          </svg>

          <span className="rtl">منصتي التعليمية</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-[2px]">
        <Link href="/" className={navLinkClass("/")}>
          <span className="rtl w-full">الرئيسية</span>
        </Link>

        <Link href="/courses" className={navLinkClass("/courses")}>
          <span className="rtl w-full">جميع الدورات</span>
        </Link>

        <Link href="/my-courses" className={navLinkClass("/my-courses")}>
          <span className="rtl w-full">موادي</span>
        </Link>
      </nav>
    </aside>
  );
}
