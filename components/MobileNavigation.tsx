"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { BookIcon, CapIcon, HomeIcon, UserIcon } from "@/components/icons";

export default function MobileNavigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const ar = language === "ar";
  const items = [
    { href: "/", label: ar ? "الرئيسية" : "Home", icon: HomeIcon },
    { href: "/courses", label: ar ? "الدورات" : "Courses", icon: BookIcon },
    ...(isAuthenticated ? [{ href: "/my-courses", label: ar ? "دوراتي" : "My courses", icon: CapIcon }] : []),
    ...(isAuthenticated ? [{ href: "/support", label: ar ? "الدعم" : "Support", icon: LifeBuoy }] : []),
    { href: isAuthenticated ? "/profile" : "/login", label: ar ? (isAuthenticated ? "حسابي" : "الدخول") : (isAuthenticated ? "Account" : "Sign in"), icon: UserIcon },
  ];
  return <nav className="yw-mobile-nav" aria-label={ar ? "التنقل السريع" : "Quick navigation"}>{items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon width={20} height={20} /><span>{label}</span></Link>;
  })}</nav>;
}
