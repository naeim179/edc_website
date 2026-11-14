"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, LifeBuoy, ShieldCheck } from "lucide-react";
import { supportApi } from "@/lib/support/api";
import { SUPPORT_CATEGORIES, type SupportAdapter, type SupportCategory, type SupportError, type SupportOptions } from "@/lib/support/types";
import { useSupportCopy } from "./SupportShared";

export default function SupportNewForm({ options,api = supportApi,onCreated,onBack }: { options: SupportOptions; api?: SupportAdapter; onCreated?: (id: string) => void; onBack?: () => void }) {
 const { s } = useSupportCopy(); const router = useRouter();
 const [category,setCategory] = useState<SupportCategory>("technical"); const [course,setCourse] = useState("");
 const [busy,setBusy] = useState(false); const [error,setError] = useState<SupportError | null>(null); const requestId = useRef<string | null>(null);
 return <div className="support-workspace support-new-workspace">
  {onBack ? <button className="support-back" onClick={onBack}><ArrowRight size={16} className="ltr:rotate-180" />{s.back}</button> : <Link className="support-back" href="/support"><ArrowRight size={16} className="ltr:rotate-180" />{s.back}</Link>}
  <header className="support-page-heading"><div><p className="support-eyebrow"><LifeBuoy size={16} />{s.nav}</p><h1>{s.newTitle}</h1><p>{s.newIntro}</p></div></header>
  <div className="support-new-grid"><form className="support-panel support-form" onSubmit={async event => {
   event.preventDefault(); if (busy) return; setBusy(true); setError(null);
   const form = new FormData(event.currentTarget); requestId.current ??= crypto.randomUUID();
   try {
    const r = await api.create({ requestId: requestId.current,title: String(form.get("title") ?? ""),body: String(form.get("body") ?? ""),category,courseId: course,orderId: String(form.get("order") ?? "") });
    if (r.ok) { if (onCreated) onCreated(r.data); else router.push(`/support/${r.data}`); }
    else setError(r.error);
   } catch { setError("unavailable"); } finally { setBusy(false); }
  }}>
   <label>{s.subject}<input name="title" required minLength={3} maxLength={160} placeholder={s.subjectHint} disabled={busy} /></label>
   <label>{s.category}<select aria-label={s.category} value={category} onChange={e => setCategory(e.target.value as SupportCategory)} disabled={busy}>{SUPPORT_CATEGORIES.map(x => <option key={x} value={x}>{s.categories[x]}</option>)}</select></label>
   <div className="support-form-columns"><label>{s.course}<select aria-label={s.course} value={course} onChange={e => setCourse(e.target.value)} disabled={busy}><option value="">{s.noCourse}</option>{options.courses.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
   <label>{s.order}<select aria-label={s.order} name="order" key={course} disabled={busy}><option value="">{s.noOrder}</option>{options.orders.filter(x => !course || x.course_id===course).map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
   <p className="support-field-hint">{s.orderHint}</p>
   <label>{s.description}<textarea name="body" required minLength={10} maxLength={5000} rows={7} placeholder={s.descriptionHint} disabled={busy} /></label>
   <p className="support-field-hint">{s.attachmentHint}</p>
   {error && <p role="alert" className="support-feedback">{s.errors[error]}</p>}
   <div className="support-form-footer"><p><ShieldCheck size={16} />{s.privacyHint}</p><button className="support-button" disabled={busy}>{busy ? s.sending : s.send}</button></div>
  </form><aside className="support-new-aside"><LifeBuoy size={28} /><h2>{s.conversation}</h2><p>{s.intro}</p><hr /><p>{s.descriptionHint}</p><p>{s.publicHint}</p></aside></div>
 </div>;
}
