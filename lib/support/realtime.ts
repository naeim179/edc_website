import { createClient } from "@/lib/supabase/client";
import { subscribeChat as subscribeAuthenticated } from "@/lib/chat-realtime";

// Only ticket metadata is replicated. Message bodies, internal notes and files
// are fetched through the existing checked RPC, never trusted from an event.
export function subscribeSupportUpdates(
  ticketId: string | undefined,
  onChange: () => void,
  onConnection: (connected: boolean) => void,
) {
  const client = createClient();
  const channel = client.channel(`support:${crypto.randomUUID()}`);
  const filter = {
    schema: "public",
    table: "support_tickets",
    ...(ticketId ? { filter: `id=eq.${ticketId}` } : {}),
  };
  channel
    .on("postgres_changes", { ...filter, event: "INSERT" }, onChange)
    .on("postgres_changes", { ...filter, event: "UPDATE" }, onChange);
  return subscribeAuthenticated(client, channel, status => {
    onConnection(status === "SUBSCRIBED");
  });
}
