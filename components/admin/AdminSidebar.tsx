import Link from "next/link";

export default function AdminSidebar() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-right space-y-4">
      <h2 className="text-lg font-bold text-slate-800">
        لوحة الإدارة
      </h2>

      <nav className="space-y-2">
        <Link
          href="/admin"
          className="block px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          الرئيسية
        </Link>

        <Link
          href="/admin/courses"
          className="block px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          إدارة الدورات
        </Link>
      </nav>
    </div>
  );
}
