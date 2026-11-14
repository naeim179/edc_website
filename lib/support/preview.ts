// Development-only fixtures. No connection to real accounts, payments or storage.
import { MAX_SUPPORT_FILE_BYTES, supportMime } from "./validation";
import type { SupportAdapter, SupportDetail, SupportFile, SupportList, SupportOptions, SupportResult } from "./types";
const ticketId = (n: number) => `71000000-0000-4000-8000-${n.toString().padStart(12,"0")}`;
const staffId = "72000000-0000-4000-8000-000000000001";
const courseId = "73000000-0000-4000-8000-000000000001";
const orderId = "74000000-0000-4000-8000-000000000001";
const ok = <T>(data: T): SupportResult<T> => ({ ok: true,data });
export function createSupportPreview() {
 const records = new Map<string,SupportDetail>(); const owned = new Set<string>(); const uploads = new Map<string,SupportFile & { url: string }>(); let staff = false;
 const clock = () => new Date().toISOString();
 function reset() {
  for (const f of uploads.values()) URL.revokeObjectURL(f.url); uploads.clear(); records.clear(); owned.clear();
  const titles = ["الاشتراك لم يتفعّل بعد الدفع","الصوت غير واضح في الدرس الثاني","استفسار عن موعد الجلسة القادمة","تعذّر فتح ملف الواجب","تعديل الموعدين في الدورة الخاصة","تم حل مشكلة الدخول للحساب"];
  const states = ["new","in_progress","waiting_user","new","in_progress","resolved"] as const;
  titles.forEach((title,i) => {
   const id = ticketId(i+1); const date = new Date(Date.now()-(i+1)*3600000).toISOString();
   if (i<3 || i===5) owned.add(id);
   const initial: SupportDetail = {
    ticket: { id,number: 1048-i,title,category: i===0 ? "payment" : i===3 ? "technical" : i===5 ? "account" : "course",status: states[i],priority: i===0 ? "high" : "normal",created_at: date,updated_at: date,requester: i<3 || i===5 ? "سارة أحمد" : "عمر خالد",assignee: i===1 || i===2 ? "فريق الدعم" : null,assigned_to: i===1 || i===2 ? staffId : null,course_id: courseId,course_title: "أساسيات الأمن السيبراني",order_id: i===0 ? orderId : null,version: 1,unread: i===2 ? 1 : 0 },
    messages: [{ id: crypto.randomUUID(),body: i===0 ? "أتممت خطوات الدفع للدورة، لكن الاشتراك لم يظهر ضمن دوراتي بعد. ممكن تتأكدوا من حالة العملية؟" : "مرحبًا، أحتاج مساعدة بخصوص هذه المشكلة في دورتي. شكرًا لكم.",internal: false,created_at: date,author: "requester",author_name: i<3 || i===5 ? "سارة أحمد" : "عمر خالد",files: [] }],
    hasMore: false,events: [{ id: crypto.randomUUID(),kind: "created",before_value: null,after_value: { status: "new" },created_at: date,actor_name: "سارة أحمد" }],staff: [{ id: staffId,name: "فريق الدعم" }],
   };
   if (i===2) initial.messages.push({ id: crypto.randomUUID(),body: "أهلًا سارة، ممكن تحددي الموعد الذي ظهر عندك؟ سنراجع الجدول مع المدرّس.",internal: false,created_at: new Date(Date.now()-1800000).toISOString(),author: "support",author_name: "فريق الدعم",files: [] });
   if (i===0) initial.messages.push({ id: crypto.randomUUID(),body: "ملاحظة داخلية تجريبية: نراجع مرجع العملية مع مسؤول المدفوعات قبل الرد.",internal: true,created_at: new Date(Date.now()-900000).toISOString(),author: "support",author_name: "فريق الدعم",files: [] });
   records.set(id,initial);
  });
 }
 function visible(id: string) {
  const d = records.get(id); if (!d || (!staff && !owned.has(id))) return null;
  const clone = structuredClone(d); if (!staff) { clone.messages=clone.messages.filter(m => !m.internal); clone.events=clone.events.filter(e => e.kind!=="management"); clone.staff=[]; clone.ticket.requester=null; }
  return clone;
 }
 const options: SupportOptions = { courses: [{ id: courseId,title: "أساسيات الأمن السيبراني" }],orders: [{ id: orderId,course_id: courseId,label: "74000000 · أساسيات الأمن السيبراني" }] };
 const api: SupportAdapter = {
  list: async (admin,filters) => {
   const all = [...records.values()].filter(d => admin || owned.has(d.ticket.id)).map(d => structuredClone(d.ticket));
   const filtered = all.filter(t => (!filters.query || `${t.title} ${t.number}`.toLowerCase().includes(filters.query.toLowerCase())) && (!filters.status || t.status===filters.status) && (!filters.category || t.category===filters.category) && (!filters.priority || t.priority===filters.priority) && (!filters.assigned || (filters.assigned==="me" ? t.assigned_to===staffId : !t.assigned_to)));
   const data: SupportList = { items: filtered,total: filtered.length,page: 1,pages: 1,stats: { total: all.length,active: all.filter(t => !["resolved","closed"].includes(t.status)).length,waiting: all.filter(t => t.status==="waiting_user").length,resolved: all.filter(t => ["resolved","closed"].includes(t.status)).length } };
   return ok(data);
  },
  detail: async id => { const d = visible(id); return d ? ok(d) : { ok: false,error: "unauthorized" }; },
  create: async input => {
   const existing = [...records.values()].find(d => d.messages[0].id===input.requestId); if (existing) return ok(existing.ticket.id);
   const id = crypto.randomUUID(); const at = clock(); owned.add(id);
   records.set(id,{ ticket: { id,number: 1049+records.size-6,title: input.title,category: input.category,status: "new",priority: "normal",created_at: at,updated_at: at,requester: "سارة أحمد",assignee: null,assigned_to: null,course_id: input.courseId || null,course_title: input.courseId ? options.courses[0].title : null,order_id: input.orderId || null,version: 1,unread: 0 },messages: [{ id: input.requestId,body: input.body,internal: false,created_at: at,author: "requester",author_name: "سارة أحمد",files: [] }],events: [{ id: crypto.randomUUID(),kind: "created",before_value: null,after_value: { status: "new" },created_at: at }],hasMore: false,staff: [{ id: staffId,name: "فريق الدعم" }] });
   return ok(id);
  },
  reply: async (id,input) => {
   const d=records.get(id); if (!d || (!staff && !owned.has(id)) || (input.internal && !staff)) return { ok: false,error: "unauthorized" };
   if (d.messages.some(m => m.id===input.requestId)) return ok(input.requestId);
   if (["closed","resolved"].includes(d.ticket.status) && !input.internal) return { ok: false,error: "reopen" };
   d.messages.push({ id: input.requestId,body: input.body,internal: input.internal,created_at: clock(),author: staff ? "support" : "requester",author_name: staff ? "فريق الدعم" : "سارة أحمد",files: input.fileIds.map(x => uploads.get(x)!).filter(Boolean).map(({ id,name,bytes }) => ({ id,name,bytes })) });
   d.ticket.version++; d.ticket.updated_at=clock(); if (!input.internal) d.ticket.unread++;
   if (d.ticket.status==="new" && staff || d.ticket.status==="waiting_user" && !staff) d.ticket.status="in_progress";
   return ok(input.requestId);
  },
  update: async (id,input) => {
   const d=records.get(id); if (!d) return { ok: false,error: "unauthorized" };
   if (input.version!==d.ticket.version) return { ok: false,error: "stale" };
   const at=clock();
   if (input.status!==d.ticket.status) d.events.push({ id: crypto.randomUUID(),kind: "status",before_value: { status: d.ticket.status },after_value: { status: input.status },created_at: at,actor_name: staff ? "فريق الدعم" : "سارة أحمد" });
   d.ticket={ ...d.ticket,...input,assigned_to: input.assignee,assignee: input.assignee ? "فريق الدعم" : null,version: d.ticket.version+1,updated_at: at }; return ok(true);
  },
  markRead: async id => { const d=records.get(id); if (d) d.ticket.unread=0; return ok(true); },
  upload: async (_id,file) => {
   if (file.size>MAX_SUPPORT_FILE_BYTES || !supportMime(new Uint8Array(await file.arrayBuffer()))) return { ok: false,error: "attachment" };
   const id=crypto.randomUUID(); const value={ id,name: file.name,bytes: file.size,url: URL.createObjectURL(file) }; uploads.set(id,value); return ok({ id,name: value.name,bytes: value.bytes });
  },
  removeFile: async id => {
   if ([...records.values()].some(d => d.messages.some(m => m.files.some(f => f.id===id)))) return false;
   const f=uploads.get(id); if (f) URL.revokeObjectURL(f.url); uploads.delete(id); return true;
  },
  fileUrl: id => uploads.get(id)?.url ?? "#",
 };
 reset();
 return { api,options,setStaff: (value: boolean) => { staff=value; },reset,initial: () => visible(ticketId(1))!,clean: () => { for (const f of uploads.values()) URL.revokeObjectURL(f.url); } };
}
