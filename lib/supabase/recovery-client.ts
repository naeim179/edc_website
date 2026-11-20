import { createBrowserClient } from "@supabase/ssr";

// Verify recovery links explicitly; an existing login must not mask an invalid link.
export function createRecoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { isSingleton: false, auth: { detectSessionInUrl: false, autoRefreshToken: false } },
  );
}
