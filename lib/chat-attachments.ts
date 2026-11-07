import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_FILE_LIMIT = 10 * 1024 * 1024;
export const CHAT_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.avif,.pdf,.doc,.docx,.zip";

export function chatAttachmentPath(value: string, conversationId: string): string | null {
  let path = value;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|authenticated|public)\/chat-files\/(.+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  if (!path.startsWith(`${conversationId}/`) || path.split("/").some(part => !part || part === "." || part === "..") || /[\\?#\u0000-\u001f]/.test(path)) return null;
  return path;
}

export function validChatFile(name: string, size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= CHAT_FILE_LIMIT && /\.(png|jpe?g|webp|gif|avif|pdf|docx?|zip)$/i.test(name);
}

export async function signChatAttachments<T extends { conversation_id: string; deleted_at: string | null; attachment_url: string | null }>(supabase: SupabaseClient, messages: T[]): Promise<T[]> {
  const paths = messages.map(message => !message.deleted_at && message.attachment_url ? chatAttachmentPath(message.attachment_url, message.conversation_id) : null);
  const unique = [...new Set(paths.filter((path): path is string => path !== null))];
  if (!unique.length) return messages.map(message => ({ ...message, attachment_url: null }));
  const { data, error } = await supabase.storage.from("chat-files").createSignedUrls(unique, 3600);
  if (error) return messages.map(message => ({ ...message, attachment_url: null }));
  const signed = new Map((data ?? []).map(item => [item.path, item.signedUrl || null]));
  return messages.map((message, index) => ({ ...message, attachment_url: paths[index] ? signed.get(paths[index]!) ?? null : null }));
}
