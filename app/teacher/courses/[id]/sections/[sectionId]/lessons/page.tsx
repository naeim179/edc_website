import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import LessonManager from "@/components/lessons/LessonManager";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import { requireTeacher } from "@/lib/auth/require-teacher";
import {
  teacherCreateLesson,
  teacherDeleteLesson,
  teacherUpdateLesson,
} from "@/app/actions/teacher-content";

export default async function TeacherLessonsPage({ params }: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  await requireTeacher();
  const { id, sectionId } = await params;
  if (!(await canManageCourse(id))) notFound();

  const admin = createAdminClient();
  const { data: section, error: sectionError } = await admin
    .from("sections").select("id,title")
    .eq("id", sectionId).eq("course_id", id).maybeSingle();
  if (sectionError) throw new Error("Could not load lesson section");
  if (!section) notFound();

  const { data: lessons, error: lessonsError } = await admin
    .from("lessons")
    .select("id,title,content_url,video_provider,youtube_video_id,mux_asset_id,mux_playback_id,bunny_library_id,bunny_video_id,lesson_type,live_platform,live_schedule,order_index,is_free_preview")
    .eq("section_id", sectionId).order("order_index");
  if (lessonsError) throw new Error("Could not load lessons");

  return (
    <AppShell>
      <LessonManager
        courseId={id}
        sectionTitle={section.title}
        backHref={`/teacher/courses/${id}/sections`}
        createAction={teacherCreateLesson.bind(null, sectionId, id)}
        lessons={(lessons ?? []).map(lesson => ({
          ...lesson,
          updateAction: teacherUpdateLesson.bind(null, lesson.id, id, sectionId),
          deleteAction: teacherDeleteLesson.bind(null, lesson.id, id, sectionId),
        }))}
      />
    </AppShell>
  );
}
