import Link from "next/link";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {

  const supabase = await createClient();

  const {
    data:{user}
  } = await supabase.auth.getUser();


  if(!user){
    return null;
  }


  const {data: profile}= await supabase
    .from("profiles")
    .select(`
      full_name,
      phone,
      avatar_url,
      role
    `)
    .eq("id",user.id)
    .maybeSingle();



  if(!profile){
    return null;
  }



  return (
    <AppShell>

      <div className="max-w-3xl mx-auto w-full space-y-6">


        <div className="bg-white rounded-2xl border p-6 text-right">

          <h1 className="text-2xl font-bold">
            الملف الشخصي
          </h1>


          <p className="mt-2 text-slate-500">
            الدور: {profile.role}
          </p>


          <Link
            href="/my-courses"
            className="inline-block mt-5 bg-[#087a54] text-white px-5 py-3 rounded-lg"
          >
            دوراتي التعليمية
          </Link>


        </div>


        <ProfileForm profile={profile}/>


      </div>

    </AppShell>
  );
}
