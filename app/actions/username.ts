"use server";

import { createClient } from "@/lib/supabase/server";

const RESERVED = ["admin", "administrator", "support", "root", "yourway", "moderator", "teacher"];

export async function updateUsername(
  raw: string
): Promise<{ ok?: true; error?: "unauthenticated" | "invalid" | "reserved" | "taken" | "failed" }> {
  const username = raw.trim();

  if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) return { error: "invalid" };
  if (RESERVED.includes(username.toLowerCase())) return { error: "reserved" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .select("id");

  if (error) { console.error("[updateUsername] db error", error); } if (error) return { error: error.code === "23505" ? "taken" : "failed" };
  if (!data?.length) { console.error("[updateUsername] no rows updated for", user.id); return { error: "failed" }; }

  return { ok: true };
}
