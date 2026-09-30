"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveLoginIdentifier } from "@/lib/resolve-login-identifier";

export async function loginWithIdentifier(
  identifier: string,
  password: string
): Promise<{ error?: string; role?: string }> {
  if (!identifier?.trim() || !password) return { error: "invalid" };

  const email = await resolveLoginIdentifier(identifier);
  if (!email) return { error: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "invalid" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return { role: (profile?.role as string | undefined) ?? undefined };
}
