"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { UUID, optionalId, validCreate, validReply, validUpdate, supportError } from "@/lib/support/validation";
import type { SupportCreate, SupportDetail, SupportFilters, SupportList, SupportReply, SupportResult, SupportUpdate } from "@/lib/support/types";

// All mutations use the caller's session. No service-role bypass or client-supplied owner.
async function call<T>(name: string, args: Record<string, unknown>): Promise<SupportResult<T>> {
 try {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, error: "unauthorized" };
  const { data, error } = await db.rpc(name, args);
  if (error) return { ok: false, error: supportError(error) };
  return { ok: true, data: data as T };
 } catch { return { ok: false, error: "unavailable" }; }
}
function refresh(id?: string) {
 revalidatePath("/support"); revalidatePath("/admin/support");
 if (id) { revalidatePath(`/support/${id}`); revalidatePath(`/admin/support/${id}`); }
}
export async function listSupportTickets(staff: boolean, filters: SupportFilters = {}): Promise<SupportResult<SupportList>> {
 if (typeof staff !== "boolean" || !filters || typeof filters !== "object") return { ok: false, error: "invalid" };
 return call("support_list_tickets", { p_staff: staff, p_query: typeof filters.query === "string" ? filters.query.slice(0,160) : "", p_status: filters.status ?? "", p_category: filters.category ?? "", p_priority: filters.priority ?? "", p_assigned: filters.assigned ?? "", p_page: Number.isSafeInteger(filters.page) ? Math.max(1,filters.page!) : 1 });
}
export async function getSupportTicket(id: string, staff: boolean, before?: string): Promise<SupportResult<SupportDetail>> {
 if (!UUID.test(id) || typeof staff !== "boolean" || !optionalId(before)) return { ok: false, error: "invalid" };
 return call("support_get_ticket", { p_ticket: id, p_staff: staff, p_before: before || null });
}
export async function createSupportTicket(input: SupportCreate): Promise<SupportResult<string>> {
 if (!validCreate(input)) return { ok: false, error: "invalid" };
 const result = await call<string>("support_create_ticket", { p_request: input.requestId, p_title: input.title.trim(), p_body: input.body.trim(), p_category: input.category, p_course: input.courseId || null, p_order: input.orderId || null });
 if (result.ok) refresh();
 return result;
}
export async function replySupportTicket(id: string, input: SupportReply): Promise<SupportResult<string>> {
 if (!UUID.test(id) || !validReply(input)) return { ok: false, error: "invalid" };
 const result = await call<string>("support_reply", { p_ticket: id, p_request: input.requestId, p_body: input.body.trim(), p_internal: input.internal, p_files: input.fileIds });
 if (result.ok) refresh(id);
 return result;
}
export async function updateSupportTicket(id: string, input: SupportUpdate): Promise<SupportResult<boolean>> {
 if (!UUID.test(id) || !validUpdate(input)) return { ok: false, error: "invalid" };
 const result = await call<boolean>("support_update_ticket", { p_ticket: id, p_version: input.version, p_status: input.status, p_priority: input.priority, p_assignee: input.assignee || null });
 if (result.ok) refresh(id);
 return result;
}
export async function markSupportRead(id: string, through: string): Promise<SupportResult<boolean>> {
 if (!UUID.test(id) || typeof through !== "string" || !Number.isFinite(Date.parse(through))) return { ok: false, error: "invalid" };
 return call("support_mark_read", { p_ticket: id, p_through: through });
}
