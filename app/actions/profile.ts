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
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }


  const { data: currentProfile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();


  if (currentProfile?.role === "teacher") {
    const { error: teacherError } =
      await supabase
        .from("teacher_profiles")
        .update({
          image_url: avatarUrl || null,
        })
        .eq("user_id", user.id);


    if (teacherError) {
      throw new Error(teacherError.message);
    }
  }


  revalidatePath("/profile");
  revalidatePath("/", "layout");
}


export async function removeAvatar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }


  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();


  if (!profile || profile.role !== "teacher") {
    throw new Error("Not allowed");
  }


  if (profile.avatar_url) {

    const path =
      profile.avatar_url.split("/images/")[1];


    if (path) {
      await supabase.storage
        .from("images")
        .remove([path]);
    }
  }


  const { error } =
    await supabase
      .from("profiles")
      .update({
        avatar_url: null,
      })
      .eq("id", user.id);


  if (error) {
    throw new Error(error.message);
  }


  await supabase
    .from("teacher_profiles")
    .update({
      image_url: null,
    })
    .eq("user_id", user.id);


  revalidatePath("/", "layout");

  return { success: true };
}
