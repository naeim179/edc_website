import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
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

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "مستخدم";

  const roleLabel =
    profile.role === "admin"
      ? "مدير المنصة"
      : "طالب";

  return (
    <AppShell>
      <div
        className="max-w-5xl mx-auto w-full bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden"
        dir="rtl"
      >

        <section className="p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div className="flex items-center gap-5">

              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-50 text-[#1f5aa6] flex items-center justify-center text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="text-right">

                <h1 className="text-3xl font-bold text-slate-800">
                  {displayName}
                </h1>

                <p
                  className="text-slate-500 mt-1"
                  dir="ltr"
                >
                  {user.email}
                </p>

                <span className="inline-block mt-3 px-4 py-1 rounded-full bg-blue-50 text-[#1f5aa6] text-sm font-bold">
                  {roleLabel}
                </span>

              </div>

            </div>


            <Link
              href="/my-courses"
              className="bg-[#1f5aa6] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition text-center"
            >
              دوراتي التعليمية
            </Link>

          </div>
        </section>


        <div className="border-t border-slate-100" />


        <div className="flex gap-8 px-8 pt-6 text-sm font-bold">

          <button className="text-[#1f5aa6] border-b-2 border-[#1f5aa6] pb-3">
            الملف الشخصي
          </button>

          <button className="text-slate-400 pb-3">
            إعدادات الحساب
          </button>

        </div>


        <section className="p-8">

          <div className="mb-6 text-right">

            <h2 className="text-2xl font-bold text-slate-800">
              تعديل البيانات
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              حدّث معلومات حسابك الشخصية.
            </p>

          </div>


          <ProfileForm profile={profile} />

        </section>

      </div>
    </AppShell>
  );
}
