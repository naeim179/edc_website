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

  if (status === "ready" || status === "verify") {
    const { data, error } = await supabase.rpc("list_admin_authenticators");
    if (error) throw new Error("Unable to load authenticators");
    return <AdminMfaForm status={status} authenticators={data ?? []} />;
  }

  return <AdminMfaForm status={status} />;
}
