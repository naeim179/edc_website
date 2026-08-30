import AppShell from "@/components/AppShell";

export default function MyCoursesPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          موادي
        </h1>

        <p className="text-sm text-slate-500">
          ستظهر هنا الدورات المسجل بها الطالب.
        </p>
      </div>
    </AppShell>
  );
}
