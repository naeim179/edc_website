import { createLesson } from "@/app/actions/admin-lessons";
import LessonVideoFields from "@/components/lessons/LessonVideoFields";

export default function LessonForm({
  sectionId,
  courseId,
}: {
  sectionId: string;
  courseId: string;
}) {
  const action =
    createLesson.bind(
      null,
      sectionId,
      courseId
    );

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border bg-white p-6 text-right"
      dir="rtl"
    >
      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          عنوان الدرس
        </label>

        <input
          name="title"
          placeholder="مثال: مقدمة في الأمن السيبراني"
          className="w-full rounded-xl border px-4 py-3"
          required
        />
      </div>

      <LessonVideoFields courseId={courseId} />

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          ترتيب الدرس
        </label>

        <input
          name="order_index"
          type="number"
          min="0"
          defaultValue={0}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_free_preview"
        />

        <span className="font-bold text-slate-700">
          معاينة مجانية
        </span>
      </label>

      <button className="w-full rounded-xl bg-[#087a54] px-5 py-3 font-bold text-white">
        إضافة درس
      </button>
    </form>
  );
}
