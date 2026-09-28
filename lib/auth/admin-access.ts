import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/permissions";

export async function getAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: p } = await supabase
    .from("profiles")
    .select("role, is_super_admin, permissions")
    .eq("id", user.id)
    .maybeSingle();

  if (!p || p.role !== "admin") return null;
  return {
    userId: user.id,
    isSuper: !!p.is_super_admin,
    permissions: (p.permissions ?? []) as string[],
  };
}

export async function requireSuperAdmin() {
  const a = await getAdminAccess();
  if (!a) redirect("/");
  if (!a.isSuper) redirect("/admin");
  return a;
}

export async function requirePermission(permission: Permission) {
  const a = await getAdminAccess();
  if (!a) redirect("/");
  if (!a.isSuper && !a.permissions.includes(permission)) redirect("/admin");
  return a;
}

export async function hasAdminPermission(permission: Permission) {
  const a = await getAdminAccess();
  return !!a && (a.isSuper || a.permissions.includes(permission));
}
