import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/require-teacher";
import TeacherProfileForm from "./TeacherProfileForm";


export default async function TeacherProfilePage(){

  const user =
    await requireTeacher();


  const supabase =
    await createClient();


  const { data: profile } =
    await supabase
      .from("teacher_profiles")
      .select(`
        image_url,
        bio,
        specialization,
        experience_years
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();



  return (

    <AppShell>

      <div
        className="max-w-4xl mx-auto p-6"
        dir="rtl"
      >

        <h1 className="text-2xl font-bold mb-6">
          الملف الشخصي للمدرس
        </h1>


        <TeacherProfileForm
          teacherId={user.id}
          profile={profile}
        />


      </div>

    </AppShell>

  );

}
