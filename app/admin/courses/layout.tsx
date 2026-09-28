import { requirePermission } from "@/lib/auth/admin-access";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("manage_courses");
  return <>{children}</>;
}
