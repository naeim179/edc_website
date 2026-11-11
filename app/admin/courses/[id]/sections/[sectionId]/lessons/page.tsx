import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import LessonManager from "@/components/lessons/LessonManager";
import { createLesson, updateLesson, deleteLesson } from "@/app/actions/admin-lessons";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import { createClient } from "@/lib/supabase/server";

export default async function LessonsPage({ params }: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id, sectionId } = await params;
  if (!(await canManageCourse(id))) notFound();

  const supabase = await createClient();
  const { data: section, error: sectionError } = await supabase
    .from("sections").select("title")
    .eq("id", sectionId).eq("course_id", id).maybeSingle();
  if (sectionError) throw new Error("Could not load lesson section");
  if (!section) notFound();

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id,title,order_index,content_url,video_provider,youtube_video_id,mux_asset_id,mux_playback_id,bunny_library_id,bunny_video_id,lesson_type,live_platform,live_schedule,is_free_preview")
    .eq("section_id", sectionId).order("order_index");
  if (lessonsError) throw new Error("Could not load lessons");

  return (
    <AppShell>
      <LessonManager
        courseId={id}
        sectionTitle={section.title}
        backHref={`/admin/courses/${id}/sections`}
        createAction={createLesson.bind(null, sectionId, id)}
        lessons={(lessons ?? []).map(lesson => ({
          ...lesson,
          updateAction: updateLesson.bind(null, lesson.id, id, sectionId),
          deleteAction: deleteLesson.bind(null, lesson.id, id, sectionId),
        }))}
      />
    </AppShell>
  );
}
