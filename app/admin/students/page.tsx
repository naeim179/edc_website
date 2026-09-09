import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      created_at,
      enrollments (
        id
      )
    `)
    .eq("role", "student")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border p-6 text-right">
          <h1 className="text-2xl font-bold text-slate-800">
            إدارة الطلاب
          </h1>

          <p className="text-slate-500 mt-2">
            عرض الطلاب والدورات المسجلين بها
          </p>
        </div>


        <div className="bg-white rounded-2xl border overflow-hidden">

          <table className="w-full text-right">

            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">
                  الاسم
                </th>

                <th className="p-4">
                  عدد الدورات
                </th>

                <th className="p-4">
                  تاريخ التسجيل
                </th>

                <th className="p-4">
                  الإجراءات
                </th>
              </tr>
            </thead>


            <tbody>

              {students?.map((student) => (

                <tr
                  key={student.id}
                  className="border-t"
                >

                  <td className="p-4 font-bold">
                    {student.full_name ?? "بدون اسم"}
                  </td>


                  <td className="p-4">
                    {student.enrollments?.length ?? 0}
                  </td>


                  <td className="p-4 text-slate-500">
                    {new Date(
                      student.created_at
                    ).toLocaleDateString("ar")}
                  </td>


                  <td className="p-4">

                    <Link
                      href={`/admin/students/${student.id}`}
                      className="inline-block bg-[#087a54] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#066b49]"
                    >
                      عرض التفاصيل
                    </Link>

                  </td>

                </tr>

              ))}


            </tbody>

          </table>

        </div>

      </div>
    </AppShell>
  );
}
