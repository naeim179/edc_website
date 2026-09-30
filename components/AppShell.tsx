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
  let role: string | null = null;
  let avatarUrl: string | null = null;
  let isSuperAdmin = false;
  let permissions: string[] | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url, is_super_admin, permissions")
      .eq("id", user.id)
      .maybeSingle();

    fullName = profile?.full_name ?? null;
    role = profile?.role ?? null;
    avatarUrl =
      profile?.role === "teacher"
        ? profile?.avatar_url ?? null
        : null;

    if (profile?.role === "admin") {
      isSuperAdmin = !!profile.is_super_admin;
      permissions = (profile.permissions ?? []) as string[];
    }
  }

  const displayName =
    fullName?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <AppShellClient
      role={role}
      isAuthenticated={Boolean(user)}
      isSuperAdmin={isSuperAdmin}
      permissions={permissions}
      userName={displayName}
      avatarUrl={avatarUrl}
    >
      {children}
    </AppShellClient>
  );
}
