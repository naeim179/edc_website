"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERMISSION_KEYS } from "@/lib/permissions";

export type StaffResult =
  | { ok: true }
  | { ok: false; error: "self" | "notFound" | "alreadySuper" | "generic" };

const clean = (perms: string[]) =>
  perms.filter((p) => (PERMISSION_KEYS as readonly string[]).includes(p));

export async function setAdminPermissions(userId: string, permissions: string[]): Promise<StaffResult> {
  const me = await requireSuperAdmin();
  if (userId === me.userId) return { ok: false, error: "self" };

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ permissions: clean(permissions) })
    .eq("id", userId)
    .eq("role", "admin")
    .eq("is_super_admin", false)
    .select("id");

  if (error) return { ok: false, error: "generic" };
  if (!data?.length) return { ok: false, error: "notFound" };

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function promoteToAdmin(email: string, permissions: string[]): Promise<StaffResult> {
  const me = await requireSuperAdmin();
  const db = createAdminClient();

  const { data: id } = await db.rpc("find_user_id_by_email", { p_email: email });
  if (!id) return { ok: false, error: "notFound" };
  if (id === me.userId) return { ok: false, error: "self" };

  const { data: profile } = await db
    .from("profiles").select("is_super_admin").eq("id", id).maybeSingle();
  if (!profile) return { ok: false, error: "notFound" };
  if (profile.is_super_admin) return { ok: false, error: "alreadySuper" };

  const { error } = await db
    .from("profiles")
    .update({ role: "admin", permissions: clean(permissions) })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function revokeAdmin(userId: string): Promise<StaffResult> {
  const me = await requireSuperAdmin();
  if (userId === me.userId) return { ok: false, error: "self" };

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ role: "student", permissions: [] })
    .eq("id", userId)
    .eq("role", "admin")
    .eq("is_super_admin", false)
    .select("id");

  if (error) return { ok: false, error: "generic" };
  if (!data?.length) return { ok: false, error: "notFound" };

  revalidatePath("/admin/staff");
  return { ok: true };
}
