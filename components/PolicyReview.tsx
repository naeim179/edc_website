"use client";

import Link from "next/link";
import { InformationFrame } from "@/components/InformationPage";
import { useLanguage } from "@/components/LanguageProvider";

export default function PolicyReview() {
  const { language } = useLanguage();
  const ar = language === "ar";
  return <InformationFrame><h1>{ar ? "معاينة اعتماد السياسات" : "Policy approval preview"}</h1>
    <p className="yw-policy-notice">{ar ? "معاينة فقط — هذا النموذج غير مفعّل في الدفع، ولا يسجّل أي موافقة." : "Preview only — this control is not active in checkout and records no consent."}</p>
    <section className="yw-agreement-preview"><h2>{ar ? "صيغة مقترحة بعد اعتماد السياسات" : "Proposed wording after policies are approved"}</h2>
      <label><input type="checkbox" disabled /> <span>{ar ? "قرأت وأوافق على " : "I have read and agree to the "}<Link href="/terms">{ar ? "الشروط والأحكام" : "terms and conditions"}</Link>{ar ? " و" : " and "}<Link href="/refund-policy">{ar ? "سياسة الإلغاء والاسترجاع" : "cancellation and refund policy"}</Link>.</span></label>
      <p>{ar ? "لا يتم تفعيل هذا الخيار قبل استكمال بيانات النشاط واعتماد نص السياسات وإصداراتها. تبقى موافقة التجديد التلقائي مستقلة." : "Enable only after business details and versioned policy text are approved. Automatic renewal consent remains separate."}</p>
    </section>
  </InformationFrame>;
}
