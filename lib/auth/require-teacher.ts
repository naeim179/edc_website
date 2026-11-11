import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export async function requireTeacher(){

  const supabase = await createClient();


  const {
    data:{
      user
    },
    error: authError
  } = await supabase.auth.getUser();


  if(authError || !user){
    redirect("/login");
  }


  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (profileError) {
    throw new Error("Could not verify teacher access");
  }


  if(
    profile?.role !== "teacher" &&
    profile?.role !== "admin"
  ){
    redirect("/my-courses");
  }


  return user;

}
