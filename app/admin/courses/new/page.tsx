import AppShell from "@/components/AppShell";
import CourseForm from "@/components/admin/CourseForm";

export default function NewCoursePage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold text-right">
          إضافة دورة جديدة
        </h1>

        <CourseForm />
      </div>
    </AppShell>
  );
}
