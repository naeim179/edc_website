import AppShell from "@/components/AppShell";

import AdminAnnouncementsContent from "@/components/admin/AdminAnnouncementsContent";

import {
  requirePermission,
} from "@/lib/auth/admin-access";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export default async function AdminAnnouncementsPage() {
  await requirePermission(
    "manage_announcements"
  );

  const db =
    createAdminClient();

  const {
    data,
    error,
  } = await db
    .from("announcements")
    .select(`
      id,
      title,
      message,
      audience,
      is_active,
      created_at
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    <AppShell>
      <AdminAnnouncementsContent
        announcements={
          (data ??
            []) as {
            id: string;
            title: string;
            message: string;
            audience:
              | "student"
              | "teacher";
            is_active: boolean;
            created_at: string;
          }[]
        }
      />
    </AppShell>
  );
}
