import type { Session, SupabaseClient } from "@supabase/supabase-js";

export const RECOVERY_MARKER = "your-way-password-recovery";
type RecoveryAuth = Pick<SupabaseClient["auth"], "exchangeCodeForSession" | "verifyOtp" | "setSession" | "getSession" | "getUser" | "onAuthStateChange">;
export type RecoveryResult = { ok: true } | { ok: false; error: "invalid" | "unavailable" };

function failure(error: unknown): RecoveryResult {
  const e = error as { status?: number; name?: string } | null;
  return { ok: false, error: e?.status === 0 || Number(e?.status) >= 500 || /fetch|network|timeout/i.test(e?.name ?? "") ? "unavailable" : "invalid" };
}
async function fingerprint(session: Session) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(session.access_token));
  return `${session.user.id}:${Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("")}`;
}

// The tab marker only preserves the recovery UI across a refresh, not authorization.
// Supabase verifies the session and password update. Never store tokens/codes here.
export async function verifyPasswordRecovery(auth: RecoveryAuth, href: string, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">): Promise<RecoveryResult> {
  try {
    const url = new URL(href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const clearMarker = () => { try { storage?.removeItem(RECOVERY_MARKER); } catch {} };
    if ([url.searchParams, hash].some(p => p.has("error") || p.has("error_code"))) {
      clearMarker(); return { ok: false, error: "invalid" };
    }
    let session: Session | null = null;
    const code = url.searchParams.get("code"), tokenHash = url.searchParams.get("token_hash");
    const accessToken = hash.get("access_token"), refreshToken = hash.get("refresh_token");
    if (code || tokenHash || accessToken || refreshToken) {
      clearMarker();
      if (code) {
        let recoveryEvent = false;
        const { data: { subscription } } = auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") recoveryEvent = true; });
        try {
          const result = await auth.exchangeCodeForSession(code);
          if (result.error) return failure(result.error);
          if (!recoveryEvent) return { ok: false, error: "invalid" };
          session = result.data.session;
        } finally { subscription.unsubscribe(); }
      } else if (tokenHash && url.searchParams.get("type") === "recovery") {
        const result = await auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (result.error) return failure(result.error);
        session = result.data.session;
      } else if (accessToken && refreshToken && hash.get("type") === "recovery") {
        const result = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (result.error) return failure(result.error);
        session = result.data.session;
      } else return { ok: false, error: "invalid" };
      if (!session) return { ok: false, error: "invalid" };
      const verified = await auth.getUser();
      if (verified.error) return failure(verified.error);
      if (verified.data.user?.id !== session.user.id) return { ok: false, error: "invalid" };
      try { storage?.setItem(RECOVERY_MARKER, await fingerprint(session)); } catch { /* The verified current flow works without tab storage. */ }
      return { ok: true };
    }
    const current = await auth.getSession();
    if (current.error) return failure(current.error);
    session = current.data.session;
    if (!session || !storage || storage.getItem(RECOVERY_MARKER) !== await fingerprint(session)) return { ok: false, error: "invalid" };
    const verified = await auth.getUser();
    if (verified.error) return failure(verified.error);
    return verified.data.user?.id === session.user.id ? { ok: true } : { ok: false, error: "invalid" };
  } catch (error) { return failure(error); }
}

export function recoveryErrorKey(error: { code?: string; status?: number; name?: string }) {
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) return "recoveryRateLimited";
  if (error.code === "same_password") return "passwordSame";
  if (error.code === "weak_password") return "passwordWeak";
  return "recoveryUnavailable";
}
