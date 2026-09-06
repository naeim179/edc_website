"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const fullName = String(
    formData.get("full_name") ?? ""
  );

  const phone = String(
    formData.get("phone") ?? ""
  );

  const avatarUrl = String(
    formData.get("avatar_url") ?? ""
  );

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profile");
}
