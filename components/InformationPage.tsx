"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import DisplaySettings from "@/components/DisplaySettings";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/components/LanguageProvider";
import { DRAFT_NOTICE, informationPages, SUPPORT_EMAIL, type InformationPageId } from "@/lib/site-information";
import type { ReactNode } from "react";

export function InformationFrame({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  return <div className="yw-information" dir={ar ? "rtl" : "ltr"}>
    <a href="#information-content" className="yw-skip-link">{ar ? "تجاوز إلى المحتوى" : "Skip to content"}</a>
    <header className="yw-information-header"><Link href="/" aria-label="Your Way Academy"><BrandLogo /></Link><nav aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}><Link href="/">{ar ? "الرئيسية" : "Home"}</Link><Link href="/courses">{ar ? "الدورات" : "Courses"}</Link></nav><DisplaySettings /></header>
    <main id="information-content" tabIndex={-1} className="yw-information-content">{children}</main>
    <SiteFooter />
  </div>;
}

export default function InformationPage({ pageId }: { pageId: InformationPageId }) {
  const { language } = useLanguage();
  const page = informationPages[pageId];
  return <InformationFrame><article>
    <p className="yw-information-eyebrow">YOUR WAY ACADEMY</p>
    <h1>{page.title[language]}</h1>
    {page.draft && <p className="yw-policy-notice">{DRAFT_NOTICE[language]}</p>}
    <p className="yw-information-intro">{page.intro[language]}</p>
    {pageId === "contact" && <a className="yw-information-email" href={`mailto:${SUPPORT_EMAIL}`} dir="ltr">{SUPPORT_EMAIL}</a>}
    {page.sections.map(section => <section key={section.title.en}><h2>{section.title[language]}</h2><p>{section.text[language]}</p></section>)}
    {pageId !== "contact" && <p className="yw-information-contact"><Link href="/contact">{language === "ar" ? "للاستفسار، تواصل معنا" : "Questions? Contact us"}</Link></p>}
  </article></InformationFrame>;
}
