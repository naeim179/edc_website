"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/LanguageProvider";
import { INFORMATION_ORDER, informationNavigation, SUPPORT_EMAIL } from "@/lib/site-information-navigation";

export default function SiteFooter({ shell = false }: { shell?: boolean }) {
  const { language } = useLanguage();
  return <footer className={`yw-site-footer${shell ? " yw-site-footer-shell" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
    <div className="yw-site-footer-brand"><Link href="/" aria-label="Your Way Academy"><BrandLogo variant="compact" /></Link><p>{language === "ar" ? "تعلّم على طريقتك، وتقدّم بخطواتك." : "Learn your way. Progress at your pace."}</p></div>
    <nav aria-label={language === "ar" ? "معلومات المنصة وسياساتها" : "Platform information and policies"}>
      {INFORMATION_ORDER.map(id => <Link key={id} href={`/${id}`}>{informationNavigation[id].title[language]}{informationNavigation[id].draft && <small> ({language === "ar" ? "مسودة" : "draft"})</small>}</Link>)}
    </nav>
    <a href={`mailto:${SUPPORT_EMAIL}`} dir="ltr">{SUPPORT_EMAIL}</a>
  </footer>;
}
