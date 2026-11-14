"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FileText, LifeBuoy, LockKeyhole, Paperclip, RefreshCw, Send, X } from "lucide-react";
import { supportApi } from "@/lib/support/api";
import { MAX_SUPPORT_FILE_BYTES } from "@/lib/support/validation";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES, type SupportAdapter, type SupportDetail, type SupportError, type SupportFile, type SupportMessage, type SupportPriority, type SupportStatus, type SupportUpdate } from "@/lib/support/types";
import { SupportBadge, supportDate, useSupportCopy } from "./SupportShared";

function mergedMessages(old: SupportMessage[], incoming: SupportMessage[]) {
 return [...new Map([...old,...incoming].map(m => [m.id,m])).values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export default function SupportDetailView({ initial,staff = false,api = supportApi,onBack }: { initial: SupportDetail; staff?: boolean; api?: SupportAdapter; onBack?: () => void }) {
 const { s,language } = useSupportCopy(); const [detail,setDetail] = useState(initial); const [body,setBody] = useState(""); const [internal,setInternal] = useState(false);
 const [files,setFiles] = useState<SupportFile[]>([]); const [error,setError] = useState<SupportError | null>(null); const [busy,setBusy] = useState(false); const [uploading,setUploading] = useState(false);
 const [olderBusy,setOlderBusy] = useState(false); const [hasMore,setHasMore] = useState(initial.hasMore); const [history,setHistory] = useState(false);
 const requestId = useRef<string | null>(null); const fileInput = useRef<HTMLInputElement>(null); const draftFiles = useRef<SupportFile[]>([]); const draftBody = useRef(""); const alive = useRef(true); const busyRef = useRef(false); const requestSequence = useRef(0);
 const invalidate = useCallback(() => { requestSequence.current += 1; },[]);
 const latestShown = useRef(initial.messages.at(-1)?.id);
 const ticket = detail.ticket; const closed = ticket.status === "resolved" || ticket.status === "closed";
 const refresh = useCallback(async (showError = true) => {
  const seq = ++requestSequence.current;
  try {
   const r = await api.detail(initial.ticket.id,staff);
   if (!alive.current || seq !== requestSequence.current) return;
   if (!r.ok) { if (showError) setError(r.error); return; }
   const gap = r.data.hasMore && !!latestShown.current && !r.data.messages.some(m => m.id === latestShown.current);
   if (gap) setHasMore(true);
   latestShown.current = r.data.messages.at(-1)?.id;
   setDetail(old => ({ ...r.data,messages: gap ? r.data.messages : mergedMessages(old.messages,r.data.messages) }));
   const latest = r.data.messages.at(-1);
   if (latest && document.visibilityState === "visible") void api.markRead(initial.ticket.id,latest.created_at);
  } catch { if (alive.current && showError) setError("unavailable"); }
 },[api,initial.ticket.id,staff]);
 useEffect(() => {
  alive.current = true;
  const latest = initial.messages.at(-1); if (latest && document.visibilityState === "visible") void api.markRead(initial.ticket.id,latest.created_at);
  const update = () => { if (document.visibilityState === "visible") void refresh(false); };
  const beforeUnload = (event: BeforeUnloadEvent) => { if (draftBody.current.trim() || draftFiles.current.length) event.preventDefault(); };
  const timer = setInterval(update,20000); document.addEventListener("visibilitychange",update); window.addEventListener("beforeunload",beforeUnload);
  return () => {
   alive.current = false; invalidate(); clearInterval(timer); document.removeEventListener("visibilitychange",update); window.removeEventListener("beforeunload",beforeUnload);
   for (const f of draftFiles.current) void api.removeFile(f.id);
  };
 },[api,initial.ticket.id,initial.messages,refresh,invalidate]);
 const changeFiles = (next: SupportFile[]) => { draftFiles.current = next; setFiles(next); };
 async function updateOwn() {
  if (busyRef.current) return;
  if (!closed && !window.confirm(s.closeConfirm)) return;
  busyRef.current = true; setBusy(true); setError(null);
  try { const r = await api.update(ticket.id,{ version: ticket.version,status: closed ? "in_progress" : "closed",priority: ticket.priority,assignee: ticket.assigned_to }); if (!r.ok) setError(r.error); await refresh(); }
  catch { setError("unavailable"); } finally { busyRef.current = false; setBusy(false); }
 }
 return <div className="support-workspace">
  {onBack ? <button className="support-back" onClick={onBack}><ArrowRight size={16} className="ltr:rotate-180" />{s.back}</button> : <Link className="support-back" href={staff ? "/admin/support" : "/support"}><ArrowRight size={16} className="ltr:rotate-180" />{s.back}</Link>}
  <header className="support-page-heading"><div><p className="support-eyebrow"><LifeBuoy size={16} /><span dir="ltr">#{ticket.number.toString().padStart(4,"0")}</span><span>{s.categories[ticket.category]}</span></p><h1>{ticket.title}</h1><p>{s.updated}: <time dateTime={ticket.updated_at}>{supportDate(ticket.updated_at,language)}</time></p></div><div className="support-heading-actions">{staff && <a className="support-outline-button" href="#support-management">{s.management}</a>}<SupportBadge status={ticket.status} staff={staff} /><button className="support-icon-button" aria-label={s.refresh} onClick={() => void refresh()}><RefreshCw size={18} /></button></div></header>
  {error && <p className="support-feedback" role="alert">{s.errors[error]}</p>}
  <div className="support-detail-grid"><div className="support-conversation-column"><section className="support-panel support-thread" aria-label={s.conversation}>
   <div className="support-panel-heading"><h2>{s.conversation}</h2><span className="support-private-label"><LockKeyhole size={15} />{s.nav}</span></div>
   <div className="support-thread-messages">{hasMore && <button className="support-text-button support-older" disabled={olderBusy} onClick={async () => {
    setOlderBusy(true);
    try { const r = await api.detail(ticket.id,staff,detail.messages[0]?.id); if (r.ok) { setDetail(old => ({ ...old,messages: mergedMessages(r.data.messages,old.messages) })); setHasMore(r.data.hasMore); } else setError(r.error); }
    catch { setError("unavailable"); } finally { setOlderBusy(false); }
   }}>{olderBusy ? s.loading : s.older}</button>}
   {detail.messages.map(m => <article key={m.id} className={`support-message ${m.author === "requester" ? "support-message-requester" : "support-message-staff"}${m.internal ? " support-message-internal" : ""}`}>
    <div className="support-message-heading"><strong>{staff ? m.author_name || (m.author === "requester" ? s.requester : s.support) : m.author === "requester" ? s.you : s.support}</strong>{m.internal && <span><LockKeyhole size={13} />{s.internal}</span>}<time dateTime={m.created_at}>{supportDate(m.created_at,language)}</time></div>
    {m.body && <p dir="auto">{m.body}</p>}
    {m.files.length > 0 && <ul className="support-message-files">{m.files.map(f => <li key={f.id}><a href={api.fileUrl(f.id)} target="_blank" rel="noopener noreferrer" download={f.name}><FileText size={17} /><span>{f.name}</span><small>{(f.bytes/1024).toFixed(0)} KB</small></a></li>)}</ul>}
   </article>)}</div>
   {(closed && !internal) ? <div className="support-closed"><Check size={21} /><p>{s.closedHint}</p><button className="support-button" disabled={busy} onClick={() => void updateOwn()}>{s.reopen}</button></div> : <form className="support-composer" onSubmit={async event => {
    event.preventDefault(); if (busyRef.current || uploading) return; busyRef.current = true; setBusy(true); setError(null); requestId.current ??= crypto.randomUUID();
    try {
     const r = await api.reply(ticket.id,{ requestId: requestId.current,body,internal: staff && internal,fileIds: files.map(f => f.id) });
     if (r.ok) { setBody(""); draftBody.current = ""; changeFiles([]); requestId.current = null; await refresh(); }
     else setError(r.error);
    } catch { setError("unavailable"); } finally { busyRef.current = false; setBusy(false); }
   }}>
    <label className="support-composer-label" htmlFor="support-reply">{internal ? s.internal : s.reply}</label>
    {internal && <p className="support-internal-hint"><LockKeyhole size={15} />{s.internalHint}</p>}
    <textarea id="support-reply" value={body} onChange={e => { setBody(e.target.value); draftBody.current=e.target.value; }} maxLength={5000} rows={4} placeholder={s.replyHint} disabled={busy} />
    {files.length>0 && <ul className="support-draft-files">{files.map(f => <li key={f.id}><Paperclip size={15} /><span>{f.name}</span><button type="button" disabled={busy || uploading} aria-label={`${s.remove}: ${f.name}`} onClick={async () => { if (await api.removeFile(f.id)) changeFiles(draftFiles.current.filter(x => x.id!==f.id)); else setError("attachment"); }}><X size={15} /></button></li>)}</ul>}
    <p className="support-field-hint">{s.fileHint}</p>
    <div className="support-composer-actions"><input className="sr-only" type="file" ref={fileInput} tabIndex={-1} aria-label={s.attach} accept="image/png,image/jpeg,application/pdf" disabled={busy || uploading || files.length>=3} onChange={async event => {
     const file = event.target.files?.[0]; event.target.value=""; if (!file || files.length>=3) return;
     if (file.size===0 || file.size>MAX_SUPPORT_FILE_BYTES) { setError("attachment"); return; }
     setUploading(true); setError(null);
     try { const r = await api.upload(ticket.id,file); if (r.ok) { if (alive.current) changeFiles([...draftFiles.current,r.data]); else void api.removeFile(r.data.id); } else if (alive.current) setError(r.error); }
     catch { if (alive.current) setError("attachment"); } finally { if (alive.current) setUploading(false); }
    }} /><button className="support-outline-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy || uploading || files.length>=3}><Paperclip size={16} />{uploading ? s.uploading : s.attach}</button><button className="support-button" disabled={busy || uploading || (!body.trim() && files.length===0)}><Send size={16} />{busy ? s.sending : internal ? s.addNote : s.sendReply}</button></div>
   </form>}
   {staff && <div className="support-note-toggle"><label><input type="checkbox" checked={internal} disabled={busy || uploading} onChange={e => setInternal(e.target.checked)} /><span>{s.internal}</span></label></div>}
  </section></div>
  <aside id="support-management" className="support-detail-aside"><section className="support-panel support-ticket-facts"><h2>{s.management}</h2><dl><div><dt>{s.number}</dt><dd dir="ltr">#{ticket.number.toString().padStart(4,"0")}</dd></div><div><dt>{s.category}</dt><dd>{s.categories[ticket.category]}</dd></div>{ticket.requester && <div><dt>{s.requester}</dt><dd>{ticket.requester}</dd></div>}{ticket.course_title && <div><dt>{s.course}</dt><dd>{ticket.course_title}</dd></div>}{ticket.order_id && <div><dt>{s.order}</dt><dd dir="ltr" className="support-order-id">{ticket.order_id}</dd></div>}</dl>
   {staff ? <SupportManagement detail={detail} api={api} onSaved={() => refresh()} /> : <><p className="support-field-hint">{s.privacyHint}</p><button className="support-outline-button" disabled={busy} onClick={() => void updateOwn()}>{closed ? s.reopen : s.close}</button></>}
  </section>
  <section className="support-panel support-history"><button className="support-history-toggle" aria-expanded={history} aria-controls="support-history" onClick={() => setHistory(!history)}><span className="support-history-title">{s.history}</span><span aria-hidden="true">{history ? "−" : "+"}</span></button>{history && <div id="support-history"><p className="support-field-hint">{s.historyHint}</p><ol>{detail.events.map(event => <li key={event.id}><strong>{event.kind === "created" ? s.created : event.kind === "management" ? s.assignedChanged : s.changed}</strong>{event.kind === "status" && event.after_value?.status && <span>{s.statuses[event.after_value.status as SupportStatus]}</span>}{staff && event.actor_name && <span>{event.actor_name}</span>}<time dateTime={event.created_at}>{supportDate(event.created_at,language)}</time></li>)}</ol></div>}</section>
  </aside></div>
 </div>;
}
function SupportManagement({ detail,api,onSaved }: { detail: SupportDetail; api: SupportAdapter; onSaved: () => Promise<void> }) {
 const { s } = useSupportCopy(); const ticket = detail.ticket;
 const snapshot = (): SupportUpdate => ({ status: ticket.status,priority: ticket.priority,assignee: ticket.assigned_to,version: ticket.version });
 const [draft,setDraft] = useState<SupportUpdate | null>(null); const form = draft ?? snapshot(); const [busy,setBusy] = useState(false); const [error,setError] = useState<SupportError | null>(null); const [saved,setSaved] = useState(false);
 return <form className="support-management-form" onSubmit={async event => {
  event.preventDefault(); setBusy(true); setError(null); setSaved(false);
  try { const r = await api.update(ticket.id,form); if (!r.ok) setError(r.error); else { setSaved(true); setDraft(null); } await onSaved(); }
  catch { setError("unavailable"); } finally { setBusy(false); }
 }}>
  <label>{s.status}<select aria-label={s.status} disabled={busy} value={form.status} onChange={e => { setSaved(false); setDraft({ ...form,status: e.target.value as SupportStatus }); }}>{SUPPORT_STATUSES.map(x => <option key={x} value={x}>{x === "waiting_user" ? s.waiting : s.statuses[x]}</option>)}</select></label>
  <label>{s.priority}<select aria-label={s.priority} disabled={busy} value={form.priority} onChange={e => { setSaved(false); setDraft({ ...form,priority: e.target.value as SupportPriority }); }}>{SUPPORT_PRIORITIES.map(x => <option key={x} value={x}>{s.priorities[x]}</option>)}</select></label>
  <label>{s.assigned}<select aria-label={s.assigned} disabled={busy} value={form.assignee ?? ""} onChange={e => { setSaved(false); setDraft({ ...form,assignee: e.target.value || null }); }}><option value="">{s.unassigned}</option>{detail.staff.map(p => <option key={p.id} value={p.id}>{p.name || s.support}</option>)}</select></label>
  {error && <p className="support-feedback" role="alert">{s.errors[error]}</p>}{saved && <p className="support-save-status" role="status"><Check size={15} />{s.saved}</p>}
  <button className="support-button" disabled={busy || saved}>{busy ? s.sending : s.save}</button>
  {form.version !== ticket.version && <button className="support-text-button" type="button" disabled={busy} onClick={() => { setDraft(null); setError(null); setSaved(false); }}>{s.reloadManagement}</button>}
 </form>;
}
