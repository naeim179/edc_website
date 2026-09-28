import AppShell from "@/components/AppShell";
import StaffManager from "@/components/admin/StaffManager";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StaffPage() {
  await requireSuperAdmin();
  const db = createAdminClient();

  const { data: rows } = await db
    .from("profiles")
    .select("id, full_name, permissions")
    .eq("role", "admin")
    .eq("is_super_admin", false)
    .order("full_name");

  const admins = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data } = await db.auth.admin.getUserById(r.id);
      return {
        id: r.id as string,
        fullName: (r.full_name ?? null) as string | null,
        email: data.user?.email ?? null,
        permissions: (r.permissions ?? []) as string[],
      };
    }),
  );

  return (
    <AppShell>
      <StaffManager admins={admins} />
    </AppShell>
  );
}
