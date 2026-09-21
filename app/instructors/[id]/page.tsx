import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import InstructorProfileContent from "@/components/InstructorProfileContent";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: instructor, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      teacher_profiles (
        image_url,
        bio,
        specialization,
        experience_years
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // 22P02 = المعرّف مش UUID صالح
    if (error.code === "22P02") {
      return notFound();
    }

    throw new Error(
      `Failed to load instructor: ${error.message}`
    );
  }

  if (!instructor) {
    return notFound();
  }

  return (
    <AppShell>
      <InstructorProfileContent instructor={instructor} />
    </AppShell>
  );
}
