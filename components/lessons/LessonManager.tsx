"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import LessonTypeFields from "./LessonTypeFields";
import LessonVideoFields from "./LessonVideoFields";

export type EditableLesson = {
  id: string;
  title: string;
  content_url: string | null;
  video_provider: string | null;
  youtube_video_id: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  bunny_library_id: string | null;
  bunny_video_id: string | null;
  lesson_type: string | null;
  live_platform: string | null;
  live_schedule: string | null;
  order_index: number;
  is_free_preview: boolean | null;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
};

type Props = {
  courseId: string;
  sectionTitle: string;
  backHref: string;
  lessons: EditableLesson[];
  createAction: (formData: FormData) => Promise<void>;
};

export default function LessonManager({ courseId, sectionTitle, backHref, lessons, createAction }: Props) {
  const { language, t } = useLanguage();
  const fieldClass = "w-full rounded-xl border px-4 py-3";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-0 sm:p-6 text-start" dir={language === "ar" ? "rtl" : "ltr"}>
      <section className="rounded-[28px] border bg-[var(--brand-surface)] p-8">
        <Link href={backHref} className="font-bold text-[var(--brand-ink)] underline underline-offset-4">
          {t.teacher.backSections}
        </Link>
        <h1 className="mt-5 text-3xl font-bold">{t.teacher.manageLessonsPage}</h1>
        <p className="mt-2 text-[var(--brand-text-muted)]">{t.teacher.section} {sectionTitle}</p>
      </section>

      <form action={createAction} className="space-y-4 rounded-2xl border bg-[var(--brand-surface)] p-6">
        <h2 className="text-lg font-bold">{t.teacher.addNewLesson}</h2>
        <div>
          <label htmlFor="new-lesson-title" className="mb-2 block font-bold">{t.teacher.lessonTitle}</label>
          <input id="new-lesson-title" name="title" required placeholder={t.teacher.lessonTitle} className={fieldClass} />
        </div>
        <LessonTypeFields courseId={courseId} />
        <div>
          <label htmlFor="new-lesson-order" className="mb-2 block font-bold">{t.lessonEditor.order}</label>
          <input id="new-lesson-order" name="order_index" type="number" min="0" defaultValue={1} className={fieldClass} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_free_preview" />{t.teacher.freePreview}
        </label>
        <button type="submit" className="rounded-xl bg-[var(--brand-ink)] px-6 py-3 font-bold text-[var(--brand-on-ink)]">{t.teacher.addLesson}</button>
      </form>

      {lessons.length === 0 && <p className="rounded-2xl border p-6 text-[var(--brand-text-muted)]">{t.teacher.noLessons}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {lessons.map(lesson => (
          <div key={lesson.id} className="space-y-4 rounded-2xl border bg-[var(--brand-surface)] p-5">
            <form action={lesson.updateAction} className="space-y-4">
              <div>
                <label htmlFor={`title-${lesson.id}`} className="mb-2 block font-bold">{t.teacher.lessonTitle}</label>
                <input id={`title-${lesson.id}`} name="title" defaultValue={lesson.title} required className={fieldClass} />
              </div>
              <input type="hidden" name="lesson_type" value={lesson.lesson_type ?? "recorded"} />
              {lesson.lesson_type === "live" ? (
                <>
                  <div>
                    <label htmlFor={`platform-${lesson.id}`} className="mb-2 block font-bold">{t.lessonType.platform}</label>
                    <input id={`platform-${lesson.id}`} name="live_platform" defaultValue={lesson.live_platform ?? ""} placeholder={t.lessonType.platform} className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor={`url-${lesson.id}`} className="mb-2 block font-bold">{t.lessonType.sessionLink}</label>
                    <input id={`url-${lesson.id}`} name="content_url" defaultValue={lesson.content_url ?? ""} placeholder={t.lessonType.sessionPlaceholder} className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor={`schedule-${lesson.id}`} className="mb-2 block font-bold">{t.lessonType.schedule}</label>
                    <input id={`schedule-${lesson.id}`} name="live_schedule" defaultValue={lesson.live_schedule ?? ""} placeholder={t.lessonType.schedulePlaceholder} className={fieldClass} />
                  </div>
                </>
              ) : (
                <LessonVideoFields
                  courseId={courseId}
                  defaultProvider={lesson.video_provider === "bunny" ? "bunny" : lesson.video_provider === "mux" ? "mux" : "youtube"}
                  defaultYoutubeUrl={lesson.content_url || (lesson.youtube_video_id ? `https://www.youtube.com/watch?v=${lesson.youtube_video_id}` : "")}
                  defaultMuxPlaybackId={lesson.mux_playback_id ?? ""}
                  defaultMuxAssetId={lesson.mux_asset_id ?? ""}
                  defaultBunnyLibraryId={lesson.bunny_library_id ?? ""}
                  defaultBunnyVideoId={lesson.bunny_video_id ?? ""}
                />
              )}
              <div>
                <label htmlFor={`order-${lesson.id}`} className="mb-2 block font-bold">{t.lessonEditor.order}</label>
                <input id={`order-${lesson.id}`} name="order_index" type="number" min="0" defaultValue={lesson.order_index} className={fieldClass} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_free_preview" defaultChecked={Boolean(lesson.is_free_preview)} />{t.teacher.freePreview}
              </label>
              <button type="submit" className="w-full rounded-xl bg-[var(--brand-ink)] py-3 font-bold text-[var(--brand-on-ink)]">{t.teacher.saveChanges}</button>
            </form>
            <form action={lesson.deleteAction} onSubmit={event => { if (!window.confirm(t.lessonEditor.confirmDelete)) event.preventDefault(); }}>
              <button type="submit" className="w-full rounded-xl bg-red-50 py-3 font-bold text-red-600">{t.teacher.deleteLesson}</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
