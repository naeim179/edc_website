import { createSupportTicket, replySupportTicket, updateSupportTicket } from "@/app/actions/support";
import { getSupportLive, listSupportLive, markSupportLiveRead } from "./client-read";
import { subscribeSupportUpdates } from "./realtime";
import type { SupportAdapter } from "./types";
export const supportApi: SupportAdapter = { subscribe: subscribeSupportUpdates, list: listSupportLive, detail: getSupportLive, create: createSupportTicket, reply: replySupportTicket, update: updateSupportTicket, markRead: markSupportLiveRead,
 upload: async (id,file) => {
  try { const r = await fetch(`/api/support/attachments?ticket=${encodeURIComponent(id)}`,{ method: "POST",headers: { "Content-Type": "application/octet-stream", "x-file-name": encodeURIComponent(file.name) },body: file }); return await r.json(); }
  catch { return { ok: false, error: "attachment" }; }
 },
 removeFile: async id => { try { return (await fetch(`/api/support/attachments/${id}`,{ method: "DELETE",keepalive: true })).ok; } catch { return false; } },
 fileUrl: id => `/api/support/attachments/${id}`,
};
