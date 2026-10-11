import AppShell from "@/components/AppShell";
import CourseForm from "@/components/admin/CourseForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      category,
      price,
      currency,
      is_free,
      is_published,
      course_type,
      delivery_type,
      discount_type,
      discount_value,
      registration_open,
      group_day_of_week,
      group_start_time,
      group_end_time
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!course) {
    return null;
  }

  const {
    data: privateSlots,
    error: privateSlotsError,
  } = await supabase
    .from("private_course_availability")
    .select(`
      id,
      day_of_week,
      start_time,
      end_time
    `)
    .eq("course_id", id)
    .eq("is_active", true)
    .order("day_of_week", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  if (privateSlotsError) {
    throw new Error(
      privateSlotsError.message
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold text-right">
          تعديل الدورة
        </h1>

        <CourseForm
          course={{
            ...course,
            private_slots:
              privateSlots ?? [],
          }}
        />
      </div>
    </AppShell>
  );
}
