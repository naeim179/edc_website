export type InformationPageId = "about" | "contact" | "privacy" | "terms" | "refund-policy" | "delivery-policy";
export type InformationLanguage = "ar" | "en";
export type LocalizedCopy = { ar: string; en: string };

// Proposed contact supplied by the site operator. Mailbox delivery is not verified.
export const SUPPORT_EMAIL = "hr.yourwayacademy@gmail.com";
export const INFORMATION_ORDER: InformationPageId[] = ["about", "contact", "privacy", "terms", "refund-policy", "delivery-policy"];
export const informationNavigation: Record<InformationPageId, { title: LocalizedCopy; draft: boolean }> = {
  about: { title: { ar: "عن المنصة", en: "About the platform" }, draft: false },
  contact: { title: { ar: "تواصل معنا", en: "Contact us" }, draft: false },
  privacy: { title: { ar: "سياسة الخصوصية", en: "Privacy policy" }, draft: true },
  terms: { title: { ar: "الشروط والأحكام", en: "Terms and conditions" }, draft: true },
  "refund-policy": { title: { ar: "الإلغاء والاسترجاع", en: "Cancellation and refunds" }, draft: true },
  "delivery-policy": { title: { ar: "تقديم الخدمة التعليمية", en: "Educational service delivery" }, draft: true },
};
