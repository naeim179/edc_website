import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES, type SupportError } from "./types";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function optionalId(value: unknown) { return value === undefined || value === null || value === "" || (typeof value === "string" && UUID.test(value)); }
export function validCreate(value: unknown): boolean {
 if (!value || typeof value !== "object") return false;
 const v = value as Record<string, unknown>;
 return typeof v.requestId === "string" && UUID.test(v.requestId) && typeof v.title === "string" && v.title.trim().length >= 3 && v.title.trim().length <= 160
  && typeof v.body === "string" && v.body.trim().length >= 10 && v.body.trim().length <= 5000 && SUPPORT_CATEGORIES.some(c => c === v.category) && optionalId(v.courseId) && optionalId(v.orderId);
}
export function validReply(value: unknown): boolean {
 if (!value || typeof value !== "object") return false;
 const v = value as Record<string, unknown>;
 return typeof v.requestId === "string" && UUID.test(v.requestId) && typeof v.body === "string" && v.body.trim().length <= 5000 && typeof v.internal === "boolean"
  && Array.isArray(v.fileIds) && v.fileIds.length <= 3 && new Set(v.fileIds).size === v.fileIds.length && v.fileIds.every(x => typeof x === "string" && UUID.test(x)) && (v.body.trim().length > 0 || v.fileIds.length > 0);
}
export function validUpdate(value: unknown): boolean {
 if (!value || typeof value !== "object") return false;
 const v = value as Record<string, unknown>;
 return Number.isSafeInteger(v.version) && Number(v.version) > 0 && SUPPORT_STATUSES.some(x => x === v.status) && SUPPORT_PRIORITIES.some(x => x === v.priority) && optionalId(v.assignee);
}
export function supportError(error: { code?: string; message?: string }): SupportError {
 if (error.code === "42501") return "unauthorized";
 const keys: Record<string, SupportError> = { SUPPORT_RATE_LIMIT: "rate_limit", SUPPORT_STALE: "stale", SUPPORT_REOPEN_REQUIRED: "reopen", SUPPORT_INVALID: "invalid", SUPPORT_REFERENCE_INVALID: "reference", SUPPORT_ATTACHMENT_INVALID: "attachment", SUPPORT_ATTACHMENT_EXPIRED: "attachment_expired", SUPPORT_ASSIGNEE_INVALID: "assignee" };
 return keys[error.message ?? ""] ?? "unavailable";
}
export const MAX_SUPPORT_FILE_BYTES = 5 * 1024 * 1024;
export function supportMime(bytes: Uint8Array): string | null {
 if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return "image/png";
 if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
 if (bytes.length >= 5 && [37,80,68,70,45].every((v,i) => bytes[i] === v)) return "application/pdf";
 return null;
}

export function supportFilename(name: string,mime: string): string {
 const clean = name.replace(/[\u0000-\u001f\u007f/\\\u202a-\u202e\u2066-\u2069]/g,"_").trim();
 const base = (clean.replace(/\.[^.]*$/,"").replace(/^\.+/,"") || "attachment").slice(0,150);
 return `${base}.${mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "pdf"}`;
}

// Next.js may construct request.url from its internal bind address. Compare the
// browser Origin with the incoming Host and proxy protocol, never forwarded-host.
export function supportSameOrigin(request: Request): boolean {
 try {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  const url = new URL(request.url);
  const scheme = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":","");
  if (scheme !== "http" && scheme !== "https") return false;
  return origin === new URL(`${scheme}://${request.headers.get("host") || url.host}`).origin;
 } catch { return false; }
}
