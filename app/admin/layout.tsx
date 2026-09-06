import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-[250px_1fr] gap-6">
        <aside>
          <AdminSidebar />
        </aside>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
