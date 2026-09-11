import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import AppShellClient from "@/components/AppShellClient";

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({
  children,
}: AppShellProps) {

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  let fullName: string | null = null;
  let avatarUrl: string | null = null;
  let role: string | null = null;


  if (user) {

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle();


    fullName = profile?.full_name ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    role = profile?.role ?? null;
  }


  const displayName =
    fullName?.trim() ||
    user?.email?.split("@")[0] ||
    "User";


  return (
    <AppShellClient
      role={role}
      isAuthenticated={Boolean(user)}
      userName={displayName}
      avatarUrl={avatarUrl}
    >
      {children}
    </AppShellClient>
  );
}
