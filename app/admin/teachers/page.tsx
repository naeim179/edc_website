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
      <div className="max-w-5xl mx-auto p-6" dir="rtl">

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
                className="border rounded-lg p-4 flex items-center justify-between"
              >

                <span>
                  {teacher.full_name ?? t.admin.noName}
                </span>


                <Link
                  href={`/admin/teachers/${teacher.id}`}
                  className="bg-[#124b8a] text-white px-5 py-2 rounded-lg font-bold"
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
