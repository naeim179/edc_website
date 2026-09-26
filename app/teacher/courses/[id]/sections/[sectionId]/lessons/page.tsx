import Link from "next/link";
import AppShell from "@/components/AppShell";
import LessonVideoFields from "@/components/lessons/LessonVideoFields";
import LessonTypeFields from "@/components/lessons/LessonTypeFields";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import {
  teacherCreateLesson,
  teacherDeleteLesson,
  teacherUpdateLesson,
} from "@/app/actions/teacher-content";

export default async function TeacherLessonsPage({
  params,
}: {
  params: Promise<{
    id: string;
    sectionId: string;
  }>;
}) {
  const { id, sectionId } = await params;

  const allowed = await canManageCourse(id);

  if (!allowed) {
    return null;
  }

  const admin = createAdminClient();

  const { data: section } = await admin
    .from("sections")
    .select("id, title, course_id")
    .eq("id", sectionId)
    .eq("course_id", id)
    .maybeSingle();

  if (!section) {
    return null;
  }

  const { data: lessons } = await admin
    .from("lessons")
    .select(`
      id,
      title,
      content_url,
      video_provider,
      youtube_video_id,
      mux_asset_id,
      mux_playback_id,
      lesson_type,
      live_platform,
      live_schedule,
      order_index,
      is_free_preview
    `)
    .eq("section_id", sectionId)
    .order("order_index");

  const createAction =
    teacherCreateLesson.bind(
      null,
      sectionId,
      id
    );

  return (
    <AppShell>
      <div
        className="max-w-6xl mx-auto w-full space-y-6 p-6"
        dir="rtl"
      >
        <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8">
          <Link
            href={`/teacher/courses/${id}/sections`}
            className="text-blue-100 font-bold"
          >
            العودة للأقسام
          </Link>

          <h1 className="text-3xl font-bold mt-5">
            إدارة الدروس
          </h1>

          <p className="mt-2 text-blue-100">
            القسم: {section.title}
          </p>
        </section>

        <form
          action={createAction}
          className="bg-white border rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-bold text-lg">
            إضافة درس جديد
          </h2>

          <input
            name="title"
            required
            placeholder="عنوان الدرس"
            className="w-full border rounded-xl px-4 py-3"
          />

          <LessonTypeFields />

          <LessonVideoFields courseId={id} />

          <input
            name="order_index"
            type="number"
            min="0"
            defaultValue="1"
            className="w-full border rounded-xl px-4 py-3"
          />

          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              name="is_free_preview"
            />
            معاينة مجانية
          </label>

          <button
            type="submit"
            className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
          >
            إضافة الدرس
          </button>
        </form>

        <div className="grid md:grid-cols-2 gap-5">
          {lessons?.map((lesson) => {
            const updateAction =
              teacherUpdateLesson.bind(
                null,
                lesson.id,
                id,
                sectionId
              );

            const deleteAction =
              teacherDeleteLesson.bind(
                null,
                lesson.id,
                id,
                sectionId
              );

            return (
              <div
                key={lesson.id}
                className="bg-white border rounded-2xl p-5 space-y-4"
              >
                <form
                  action={updateAction}
                  className="space-y-4"
                >
                  <input
                    name="title"
                    defaultValue={lesson.title}
                    required
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <input
                    type="hidden"
                    name="lesson_type"
                    value={lesson.lesson_type ?? "recorded"}
                  />

                  {lesson.lesson_type === "live" ? (
                    <>
                      <input
                        name="live_platform"
                        defaultValue={lesson.live_platform ?? ""}
                        placeholder="منصة البث"
                        className="w-full border rounded-xl px-4 py-3"
                      />

                      <input
                        name="content_url"
                        defaultValue={lesson.content_url ?? ""}
                        placeholder="رابط الجلسة"
                        className="w-full border rounded-xl px-4 py-3"
                      />

                      <input
                        name="live_schedule"
                        defaultValue={lesson.live_schedule ?? ""}
                        placeholder="موعد الجلسة"
                        className="w-full border rounded-xl px-4 py-3"
                      />
                    </>
                  ) : (
                    <LessonVideoFields
                      courseId={id}
                      defaultProvider={
                        lesson.video_provider === "mux"
                          ? "mux"
                          : "youtube"
                      }
                      defaultYoutubeUrl={
                        lesson.content_url ?? ""
                      }
                      defaultMuxPlaybackId={
                        lesson.mux_playback_id ?? ""
                      }
                      defaultMuxAssetId={
                        lesson.mux_asset_id ?? ""
                      }
                    />
                  )}

                  <input
                    name="order_index"
                    type="number"
                    defaultValue={lesson.order_index}
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      name="is_free_preview"
                      defaultChecked={lesson.is_free_preview}
                    />
                    معاينة مجانية
                  </label>

                  <button
                    type="submit"
                    className="w-full bg-[#124b8a] text-white py-3 rounded-xl font-bold"
                  >
                    حفظ التعديل
                  </button>
                </form>

                <form action={deleteAction}>
                  <button
                    type="submit"
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold"
                  >
                    حذف الدرس
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
