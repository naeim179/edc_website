import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/** Server-side sign-in updates cookies before the browser's Realtime connection.
 * Bind the authenticated session before subscribing; never join chat as anon.
 */
export function subscribeChat(client: SupabaseClient, channel: RealtimeChannel, onStatus: (status: string) => void) {
  let cancelled = false;
  void client.auth.getSession().then(async ({ data, error }) => {
    if (cancelled) return;
    if (error || !data.session?.access_token) throw new Error("Chat session unavailable");
    await client.realtime.setAuth(data.session.access_token);
    if (!cancelled) channel.subscribe(onStatus);
  }).catch(() => { if (!cancelled) onStatus("CHANNEL_ERROR"); });
  return () => { cancelled = true; void client.removeChannel(channel); };
}
