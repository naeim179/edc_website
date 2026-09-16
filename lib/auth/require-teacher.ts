import { createClient } from "@/lib/supabase/server";


export async function requireTeacher(){

  const supabase = await createClient();


  const {
    data:{
      user
    }
  } = await supabase.auth.getUser();


  if(!user){
    throw new Error("Unauthorized");
  }


  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  if(
    profile?.role !== "teacher" &&
    profile?.role !== "admin"
  ){
    throw new Error(
      "Only teachers allowed"
    );
  }


  return user;

}
