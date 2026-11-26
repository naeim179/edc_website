import { redirect } from "next/navigation";
import AdminMfaForm from "@/components/auth/AdminMfaForm";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSecurityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: status } = await supabase.rpc("current_admin_mfa_status");
  if (status !== "optional" && status !== "setup" && status !== "verify"
      && status !== "ready" && status !== "recovery") redirect("/");

  return <AdminMfaForm status={status} />;
}
