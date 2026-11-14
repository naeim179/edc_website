import { createClient } from "@/lib/supabase/server";
import { MAX_SUPPORT_FILE_BYTES, UUID, supportError, supportFilename, supportMime, supportSameOrigin } from "@/lib/support/validation";

export async function POST(request: Request) {
 if (!supportSameOrigin(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
 const id = new URL(request.url).searchParams.get("ticket") ?? "";
 if (!UUID.test(id)) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
 const db = await createClient();
 const { data: { user } } = await db.auth.getUser();
 if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
 let reservation: { id: string; path: string } | null = null;
 try {
  const rawName = decodeURIComponent(request.headers.get("x-file-name") ?? "").replace(/[\u0000-\u001f/\\]/g, "_").slice(0,160);
  if (!rawName || !request.body || Number(request.headers.get("content-length")) > MAX_SUPPORT_FILE_BYTES) return Response.json({ ok: false, error: "attachment" }, { status: 413 });
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
   const { done, value } = await reader.read(); if (done) break;
   size += value.byteLength;
   if (size > MAX_SUPPORT_FILE_BYTES) { await reader.cancel(); return Response.json({ ok: false, error: "attachment" }, { status: 413 }); }
   chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  const mime = supportMime(bytes);
  if (!mime) return Response.json({ ok: false, error: "attachment" }, { status: 415 });
  const name = supportFilename(rawName,mime);
  const reserved = await db.rpc("support_reserve_file", { p_ticket: id, p_name: name, p_mime: mime, p_bytes: size });
  if (reserved.error) return Response.json({ ok: false, error: supportError(reserved.error) }, { status: 400 });
  reservation = reserved.data as { id: string; path: string };
  const uploaded = await db.storage.from("support-files").upload(reservation.path,bytes,{ contentType: mime, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const ready = await db.rpc("support_finish_file",{ p_id: reservation.id, p_cancel: false });
  if (ready.error) throw ready.error;
  return Response.json({ ok: true, data: { id: reservation.id, name, bytes: size } },{ headers: { "Cache-Control": "no-store" } });
 } catch {
  if (reservation) {
   const cancelled = await db.rpc("support_finish_file", { p_id: reservation.id, p_cancel: true });
   if (!cancelled.error) await db.storage.from("support-files").remove([reservation.path]);
  }
  return Response.json({ ok: false, error: "attachment" },{ status: 400 });
 }
}
