import { createClient } from "@/lib/supabase/client";
import { optionalId, supportError, UUID } from "./validation";
import type { SupportDetail, SupportFilters, SupportList, SupportResult } from "./types";

// The same RPCs used by SSR enforce current identity, ownership and staff roles
// in Postgres. Live reads avoid an extra Worker + Auth roundtrip per event.
async function read<T>(name: string, args: Record<string, unknown>): Promise<SupportResult<T>> {
  try {
    const { data, error } = await createClient().rpc(name, args);
    return error ? { ok: false, error: supportError(error) } : { ok: true, data: data as T };
  } catch { return { ok: false, error: "unavailable" }; }
}

export async function listSupportLive(staff: boolean, filters: SupportFilters = {}): Promise<SupportResult<SupportList>> {
  if (typeof staff !== "boolean" || !filters || typeof filters !== "object") return { ok: false, error: "invalid" };
  return read("support_list_tickets", {
    p_staff: staff,
    p_query: typeof filters.query === "string" ? filters.query.slice(0, 160) : "",
    p_status: filters.status ?? "", p_category: filters.category ?? "",
    p_priority: filters.priority ?? "", p_assigned: filters.assigned ?? "",
    p_page: Number.isSafeInteger(filters.page) ? Math.max(1, filters.page!) : 1,
  });
}

export async function getSupportLive(id: string, staff: boolean, before?: string): Promise<SupportResult<SupportDetail>> {
  if (!UUID.test(id) || typeof staff !== "boolean" || !optionalId(before)) return { ok: false, error: "invalid" };
  return read("support_get_ticket", { p_ticket: id, p_staff: staff, p_before: before || null });
}

export async function markSupportLiveRead(id: string, through: string): Promise<SupportResult<boolean>> {
  if (!UUID.test(id) || typeof through !== "string" || !Number.isFinite(Date.parse(through))) return { ok: false, error: "invalid" };
  return read("support_mark_read", { p_ticket: id, p_through: through });
}
