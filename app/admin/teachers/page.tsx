import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import TeacherCreateForm from "./TeacherCreateForm";
import Link from "next/link";
import { translations } from "@/lib/i18n";

export default async function AdminTeachersPage() {
  const supabase = await createClient();
  const t = translations.ar;

  const { data: teachers } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name
    `)
    .eq("role", "teacher")
    .order("created_at", {
      ascending: false,
    });


  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-0 sm:p-6" dir="rtl">

        <h1 className="text-2xl font-bold mb-6">
          {t.admin.manageTeachers}
        </h1>


        <TeacherCreateForm />


        <div className="mt-8 bg-white rounded-xl border p-6">

          <h2 className="text-lg font-bold mb-4">
            {t.admin.currentTeachers}
          </h2>


          <div className="space-y-3">

            {teachers?.map((teacher) => (
              <div
                key={teacher.id}
                className="flex flex-col items-stretch justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >

                <span>
                  {teacher.full_name ?? t.admin.noName}
                </span>


                <Link
                  href={`/admin/teachers/${teacher.id}`}
                  className="rounded-lg bg-[#124b8a] px-5 py-2 text-center font-bold text-white"
                >
                  {t.admin.manageAccount}
                </Link>

              </div>
            ))}


            {(!teachers || teachers.length === 0) && (
              <p className="text-slate-500">
                {t.admin.noTeachers}
              </p>
            )}

          </div>

        </div>

      </div>
    </AppShell>
  );
}
