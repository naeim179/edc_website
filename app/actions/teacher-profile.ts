"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


async function assertAdminOrSelf(teacherId:string){

  const supabase = await createClient();

  const {
    data:{user}
  } = await supabase.auth.getUser();


  if(!user){
    throw new Error("Unauthorized");
  }


  const {data:profile}=await supabase
    .from("profiles")
    .select("role")
    .eq("id",user.id)
    .maybeSingle();


  if(
    profile?.role !== "admin" &&
    user.id !== teacherId
  ){
    throw new Error("Not allowed");
  }

}




export async function updateTeacherProfile(
  teacherId:string,
  formData:FormData
){

  await assertAdminOrSelf(teacherId);


  const admin=createAdminClient();


  const imageUrl=
    String(formData.get("image_url") ?? "");


  const bio=
    String(formData.get("bio") ?? "");


  const specialization=
    String(formData.get("specialization") ?? "");


  const experienceYears=
    Number(
      formData.get("experience_years") ?? 0
    );



  const {error}=await admin
    .from("teacher_profiles")
    .upsert({

      user_id:teacherId,

      image_url:imageUrl || null,

      bio,

      specialization,

      experience_years:experienceYears,

    },
    {
      onConflict:"user_id"
    });



  if(error){
    throw new Error(error.message);
  }


  const { error: avatarError } =
    await admin
      .from("profiles")
      .update({
        avatar_url: imageUrl || null,
      })
      .eq("id", teacherId);


  if (avatarError) {
    throw new Error(avatarError.message);
  }



  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  revalidatePath("/profile");
  revalidatePath("/", "layout");

}


export async function deleteTeacherAvatar(
  teacherId:string
){

  await assertAdminOrSelf(teacherId);

  const admin = createAdminClient();


  const { data: teacherProfile } =
    await admin
      .from("teacher_profiles")
      .select("image_url")
      .eq("user_id", teacherId)
      .maybeSingle();


  const imageUrl =
    teacherProfile?.image_url;


  if (imageUrl) {

    const path =
      imageUrl.split("/images/")[1];

    if (path) {
      await admin.storage
        .from("images")
        .remove([path]);
    }

  }


  const { error: teacherError } =
    await admin
      .from("teacher_profiles")
      .update({
        image_url:null,
      })
      .eq("user_id", teacherId);


  if (teacherError) {
    throw new Error(teacherError.message);
  }


  const { error: profileError } =
    await admin
      .from("profiles")
      .update({
        avatar_url:null,
      })
      .eq("id", teacherId);


  if (profileError) {
    throw new Error(profileError.message);
  }


  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

  revalidatePath("/profile");
  revalidatePath("/", "layout");
}
