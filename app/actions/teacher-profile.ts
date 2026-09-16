"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


async function assertAdmin(){

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


  if(profile?.role !== "admin"){
    throw new Error("Only admins");
  }

}




export async function updateTeacherProfile(
  teacherId:string,
  formData:FormData
){

  await assertAdmin();


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



  revalidatePath(
    `/admin/teachers/${teacherId}`
  );

}
