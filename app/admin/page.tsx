import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getUserRole } from "@/lib/auth/get-user-role";

export default async function AdminDashboardPage() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-right">
          <h1 className="text-2xl font-bold text-slate-800">
            لوحة التحكم
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            مرحبًا بك في لوحة إدارة المنصة.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-5 text-right">
            <h2 className="font-bold text-slate-700">
              الدورات
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              إدارة الدورات التعليمية
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-5 text-right">
            <h2 className="font-bold text-slate-700">
              الطلاب
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              متابعة تسجيلات الطلاب
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-5 text-right">
            <h2 className="font-bold text-slate-700">
              المحتوى
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              إدارة الدروس والأقسام
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
