"use client";
import { supportCopy } from "@/lib/support/copy";
import { useLanguage } from "@/components/LanguageProvider";
import type { SupportStatus } from "@/lib/support/types";
export function useSupportCopy() { const { language } = useLanguage(); return { s: supportCopy[language], language, ar: language === "ar" }; }
export function SupportBadge({ status,staff = false }: { status: SupportStatus; staff?: boolean }) { const { s } = useSupportCopy(); return <span className={`support-badge support-status-${status}`}>{staff && status === "waiting_user" ? s.waiting : s.statuses[status]}</span>; }
export function supportDate(date: string, language: string) { return new Intl.DateTimeFormat(language === "ar" ? "ar-JO" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Amman" }).format(new Date(date)); }
