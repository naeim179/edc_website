import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";

export async function requireAdmin() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  return true;
}
