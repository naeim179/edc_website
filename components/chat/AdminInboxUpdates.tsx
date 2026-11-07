"use client";

import { subscribeChat } from "@/lib/chat-realtime";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The server page enforces the admin role; Realtime still applies conversation RLS.
export default function AdminInboxUpdates() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const refresh = () => router.refresh();
    const channel = supabase.channel("admin-chat-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      ;
    const dispose = subscribeChat(supabase, channel, status => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); dispose(); };
  }, [router]);
  return null;
}
