"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function CheckoutPolicyLinks() {
  const { language } = useLanguage();
  const ar = language === "ar";
  return <div className="yw-checkout-policies">
    <p>{ar ? "معلومات قبل الدفع" : "Before you pay"}</p>
    <nav aria-label={ar ? "معلومات الدفع والسياسات" : "Payment information and policies"}>
      <Link href="/terms" target="_blank" rel="noopener noreferrer">{ar ? "الشروط" : "Terms"}</Link>
      <Link href="/refund-policy" target="_blank" rel="noopener noreferrer">{ar ? "الإلغاء والاسترجاع" : "Cancellation and refunds"}</Link>
      <Link href="/delivery-policy" target="_blank" rel="noopener noreferrer">{ar ? "تقديم الخدمة" : "Service delivery"}</Link>
      <Link href="/privacy" target="_blank" rel="noopener noreferrer">{ar ? "الخصوصية" : "Privacy"}</Link>
      <Link href="/contact" target="_blank" rel="noopener noreferrer">{ar ? "تواصل معنا" : "Contact us"}</Link>
    </nav>
    <small>{ar ? "السياسات مسودات غير معتمدة بعد. تُفتح الروابط في تبويب جديد، ولا يُعد الدفع موافقة على هذه المسودات." : "Policies are unapproved drafts. Links open in a new tab; payment does not constitute agreement to these drafts."}</small>
  </div>;
}
