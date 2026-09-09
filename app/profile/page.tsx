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
      <div className="max-w-4xl mx-auto w-full space-y-6">

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-[#087a54] flex items-center justify-center text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="text-right">
                <h1 className="text-2xl font-bold text-slate-800">
                  {displayName}
                </h1>

                <p className="text-sm text-slate-500 mt-1" dir="ltr">
                  {user.email}
                </p>

                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-50 text-[#087a54] text-xs font-bold">
                  {roleLabel}
                </span>
              </div>
            </div>

            {profile.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex justify-center bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#066b49] transition"
              >
                لوحة الإدارة
              </Link>
            ) : (
              <Link
                href="/my-courses"
                className="inline-flex justify-center bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#066b49] transition"
              >
                دوراتي التعليمية
              </Link>
            )}

          </div>
        </section>

        <section>
          <div className="mb-3 text-right">
            <h2 className="text-xl font-bold text-slate-800">
              تعديل البيانات
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              حدّث معلومات حسابك الشخصية.
            </p>
          </div>

          <ProfileForm profile={profile} />
        </section>

      </div>
    </AppShell>
  );
}
