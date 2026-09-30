import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function resolveLoginIdentifier(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (value.includes("@")) return value;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await admin.rpc("get_email_by_username", { p_username: value });
  return (data as string | null) ?? null;
}
