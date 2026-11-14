import { createClient } from "@/lib/supabase/server";
import { UUID, supportSameOrigin } from "@/lib/support/validation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!UUID.test(id)) return new Response(null,{ status: 404 });
 const db = await createClient();
 const { data: { user } } = await db.auth.getUser();
 if (!user) return new Response(null,{ status: 401 });
 const { data: file, error } = await db.from("support_attachments").select("path,name,state,uploaded_by").eq("id",id).maybeSingle();
 if (error || !file || (file.state !== "linked" && !(file.state === "ready" && file.uploaded_by === user.id))) return new Response(null,{ status: 404 });
 const { data, error: signedError } = await db.storage.from("support-files").createSignedUrl(file.path,60,{ download: file.name });
 if (signedError || !data) return new Response(null,{ status: 503 });
 return new Response(null,{ status: 302, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
 if (!supportSameOrigin(request)) return Response.json({ ok: false },{ status: 403 });
 const { id } = await params;
 if (!UUID.test(id)) return Response.json({ ok: false },{ status: 400 });
 const db = await createClient();
 const { data: { user } } = await db.auth.getUser();
 if (!user) return Response.json({ ok: false },{ status: 401 });
 const { data: file } = await db.from("support_attachments").select("path").eq("id",id).eq("uploaded_by",user.id).is("message_id",null).maybeSingle();
 if (!file) return Response.json({ ok: false },{ status: 404 });
 // Claim cancellation before touching the object, serializing against message submission.
 const { error } = await db.rpc("support_finish_file",{ p_id: id, p_cancel: true });
 if (error) return Response.json({ ok: false },{ status: 409 });
 const removed = await db.storage.from("support-files").remove([file.path]);
 return Response.json({ ok: !removed.error },{ status: removed.error ? 503 : 200 });
}
