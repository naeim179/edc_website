import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProfileContent from "@/components/ProfileContent";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      full_name,
      phone,
      avatar_url,
      role
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  return (
    <AppShell>
      <ProfileContent
        profile={profile}
        email={user.email ?? ""}
      />
    </AppShell>
  );
}
