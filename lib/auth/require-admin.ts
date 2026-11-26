import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/auth/admin-access";

export async function requireAdmin() {
  if (!await getAdminAccess()) {
    redirect("/");
  }

  return true;
}
