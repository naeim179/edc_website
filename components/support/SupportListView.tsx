"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpLeft, CheckCheck, Clock3, Inbox, LifeBuoy, Plus, RefreshCw, Search } from "lucide-react";
import { supportApi } from "@/lib/support/api";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES, type SupportAdapter, type SupportFilters, type SupportList, type SupportResult } from "@/lib/support/types";
import { SupportBadge, supportDate, useSupportCopy } from "./SupportShared";

export default function SupportListView({ initial, staff = false, api = supportApi, onOpen, onNew }: { initial: SupportResult<SupportList>; staff?: boolean; api?: SupportAdapter; onOpen?: (id: string) => void; onNew?: () => void }) {
 const { s, language } = useSupportCopy();
 const [result,setResult] = useState(initial); const [filters,setFilters] = useState<SupportFilters>({}); const [applied,setApplied] = useState<SupportFilters>({});
 const [busy,setBusy] = useState(false); const sequence = useRef(0);
 const invalidate = useCallback(() => { sequence.current += 1; },[]);
 const load = useCallback(async (next: SupportFilters, silent = false) => {
  const seq = ++sequence.current; if (!silent) setBusy(true);
  let r: SupportResult<SupportList>;
  try { r = await api.list(staff,next); } catch { r = { ok: false,error: "unavailable" }; }
  if (seq !== sequence.current) return;
  setResult(r); setApplied(next); setBusy(false);
 },[api,staff]);
 useEffect(() => {
  const update = () => { if (document.visibilityState === "visible") void load(applied,true); };
  const timer = setInterval(update,30000); document.addEventListener("visibilitychange",update);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange",update); invalidate(); };
 }, [load,applied,invalidate]);
 const value = result.ok ? result.data : null;
 const metrics = [{ key: "total",label: s.total,icon: Inbox },{ key: "active",label: s.active,icon: LifeBuoy },{ key: "waiting",label: staff ? s.waiting : s.statuses.waiting_user,icon: Clock3 },{ key: "resolved",label: s.resolved,icon: CheckCheck }] as const;
 return <div className="support-workspace">
  <header className="support-page-heading"><div><p className="support-eyebrow"><LifeBuoy size={16} />{s.kicker}</p><h1>{staff ? s.adminTitle : s.title}</h1><p>{staff ? s.adminIntro : s.intro}</p></div>
   {!staff && (onNew ? <button className="support-button" onClick={onNew}><Plus size={18} />{s.newTicket}</button> : <Link className="support-button" href="/support/new"><Plus size={18} />{s.newTicket}</Link>)}
  </header>
  <div className="support-metrics">{metrics.map(({ key,label,icon: Icon }) => <div className="support-metric" key={key}><span className="support-metric-icon"><Icon size={21} /></span><p>{label}</p><strong>{value ? value.stats[key].toLocaleString(language) : "—"}</strong></div>)}</div>
  <section className="support-panel" aria-labelledby="support-list-title" aria-busy={busy}>
   <div className="support-panel-heading"><div><h2 id="support-list-title">{staff ? s.inbox : s.mine}</h2><p>{value ? `${value.total.toLocaleString(language)} ${s.results}` : s.loading}</p></div><button className="support-icon-button" aria-label={s.refresh} disabled={busy} onClick={() => void load(applied)}><RefreshCw size={18} /></button></div>
   <form className="support-filters" onSubmit={e => { e.preventDefault(); void load({ ...filters,page: 1 }); }}>
    <label className="support-search"><span className="sr-only">{s.search}</span><Search size={18} /><input value={filters.query ?? ""} onChange={e => setFilters({ ...filters,query: e.target.value })} maxLength={160} placeholder={s.search} /></label>
    <label><span>{s.status}</span><select value={filters.status ?? ""} onChange={e => setFilters({ ...filters,status: e.target.value })}><option value="">{s.all}</option>{SUPPORT_STATUSES.map(x => <option value={x} key={x}>{staff && x === "waiting_user" ? s.waiting : s.statuses[x]}</option>)}</select></label>
    <label><span>{s.category}</span><select value={filters.category ?? ""} onChange={e => setFilters({ ...filters,category: e.target.value })}><option value="">{s.all}</option>{SUPPORT_CATEGORIES.map(x => <option value={x} key={x}>{s.categories[x]}</option>)}</select></label>
    {staff && <><label><span>{s.priority}</span><select value={filters.priority ?? ""} onChange={e => setFilters({ ...filters,priority: e.target.value })}><option value="">{s.all}</option>{SUPPORT_PRIORITIES.map(x => <option value={x} key={x}>{s.priorities[x]}</option>)}</select></label><label><span>{s.assigned}</span><select value={filters.assigned ?? ""} onChange={e => setFilters({ ...filters,assigned: e.target.value })}><option value="">{s.everyone}</option><option value="me">{s.assignedMe}</option><option value="none">{s.unassigned}</option></select></label></>}
    <div className="support-filter-actions"><button className="support-button support-button-small" disabled={busy}>{busy ? s.loading : s.apply}</button><button className="support-text-button" type="button" disabled={busy} onClick={() => { setFilters({}); void load({}); }}>{s.clear}</button></div>
   </form>
   {!result.ok ? <div className="support-empty"><LifeBuoy size={32} /><h3>{s.failed}</h3><p role="alert">{s.errors[result.error]}</p><button className="support-button" onClick={() => void load(applied)} disabled={busy}>{s.retry}</button></div>
    : value && value.items.length === 0 ? <div className="support-empty"><Inbox size={36} /><h3>{s.empty}</h3><p>{s.emptyHint}</p></div>
    : <div className="support-ticket-list">{value?.items.map(ticket => <article className="support-ticket-row" key={ticket.id}>
      <div className="support-ticket-main"><div className="support-ticket-meta"><span dir="ltr">#{ticket.number.toString().padStart(4,"0")}</span><span>{s.categories[ticket.category]}</span>{ticket.unread > 0 && <span className="support-unread">{ticket.unread} {s.newReplies}</span>}</div>
       <h3>{onOpen ? <button onClick={() => onOpen(ticket.id)}>{ticket.title}</button> : <Link href={`${staff ? "/admin/support" : "/support"}/${ticket.id}`}>{ticket.title}</Link>}</h3>
       <p>{staff && ticket.requester ? `${s.requester}: ${ticket.requester} · ` : ""}{s.updated}: <time dateTime={ticket.updated_at}>{supportDate(ticket.updated_at,language)}</time></p>
      </div><div className="support-ticket-status"><SupportBadge status={ticket.status} staff={staff} />{staff && <span className={`support-priority support-priority-${ticket.priority}`}>{s.priorities[ticket.priority]}</span>}</div>
      {staff && <p className="support-ticket-assignee">{ticket.assignee || s.unassigned}</p>}
      {onOpen ? <button className="support-icon-button" aria-label={`${s.view}: ${ticket.title}`} onClick={() => onOpen(ticket.id)}><ArrowUpLeft size={20} className="ltr:rotate-90" /></button> : <Link className="support-icon-button" aria-label={`${s.view}: ${ticket.title}`} href={`${staff ? "/admin/support" : "/support"}/${ticket.id}`}><ArrowUpLeft size={20} className="ltr:rotate-90" /></Link>}
     </article>)}</div>}
   {value && value.pages > 1 && <nav className="support-pagination" aria-label={s.page}><button disabled={busy || value.page<=1} onClick={() => void load({ ...applied,page: value.page-1 })}>{s.prev}</button><span aria-live="polite">{s.page} {value.page} {s.of} {value.pages}</span><button disabled={busy || value.page>=value.pages} onClick={() => void load({ ...applied,page: value.page+1 })}>{s.next}</button></nav>}
  </section>
 </div>;
}
