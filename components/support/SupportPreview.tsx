"use client";
import { useEffect, useState } from "react";
import AppShellClient from "@/components/AppShellClient";
import { createSupportPreview } from "@/lib/support/preview";
import type { SupportDetail, SupportList, SupportResult } from "@/lib/support/types";
import SupportListView from "./SupportListView";
import SupportNewForm from "./SupportNewForm";
import SupportDetailView from "./SupportDetailView";
import { useSupportCopy } from "./SupportShared";

export default function SupportPreview() {
 const { s }=useSupportCopy();
 const [preview]=useState(createSupportPreview); const [staff,setStaff]=useState(true); const [view,setView]=useState<"list" | "new" | "detail">("list");
 const [initial,setInitial]=useState<SupportResult<SupportList> | null>(null); const [detail,setDetail]=useState<SupportDetail | null>(null); const [resetKey,setResetKey]=useState(0);
 useEffect(() => { let active=true; preview.setStaff(staff); void preview.api.list(staff,{}).then(result => { if (active) setInitial(result); }); return () => { active=false; }; },[preview,staff,resetKey]);
 useEffect(() => () => preview.clean(),[preview]);
 async function open(id: string) { const r=await preview.api.detail(id,staff); if (r.ok) { setDetail(r.data); setView("detail"); window.scrollTo(0,0); } }
 function back() { window.scrollTo(0,0); setView("list"); setResetKey(v => v+1); }
 return <AppShellClient role={staff ? "admin" : "student"} isAuthenticated userId={null} isSuperAdmin={staff} userName={staff ? "فريق الدعم — معاينة" : "سارة أحمد — معاينة"} avatarUrl={null}>
  <div className="support-workspace support-preview-controls"><p>{s.preview}</p><div><button aria-pressed={!staff} onClick={() => { setStaff(false); setView("list"); setInitial(null); }}>{s.customerView}</button><button aria-pressed={staff} onClick={() => { setStaff(true); setView("list"); setInitial(null); }}>{s.staffView}</button><button onClick={() => { preview.reset(); back(); }}>{s.previewReset}</button></div></div>
  {view==="list" && initial && <SupportListView key={`${staff}-${resetKey}`} initial={initial} staff={staff} api={preview.api} onOpen={id => void open(id)} onNew={() => { setView("new"); window.scrollTo(0,0); }} />}
  {view==="new" && <SupportNewForm options={preview.options} api={preview.api} onCreated={id => void open(id)} onBack={back} />}
  {view==="detail" && detail && <SupportDetailView key={`${staff}-${detail.ticket.id}`} initial={detail} staff={staff} api={preview.api} onBack={back} />}
 </AppShellClient>;
}
