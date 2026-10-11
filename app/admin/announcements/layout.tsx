import {
  requirePermission,
} from "@/lib/auth/admin-access";

export default async function AnnouncementsLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  await requirePermission(
    "manage_announcements"
  );

  return <>{children}</>;
}
