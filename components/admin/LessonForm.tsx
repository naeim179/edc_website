import { createLesson } from "@/app/actions/admin-lessons";

export default function LessonForm({
  sectionId,
  courseId,
}: {
  sectionId: string;
  courseId: string;
}) {
  const action = createLesson.bind(
    null,
    sectionId,
    courseId
  );

  return (
    <form
      action={action}
      className="bg-white rounded-xl border p-5 space-y-4 text-right"
    >
      <input
        name="title"
        placeholder="عنوان الدرس"
        className="w-full border rounded-lg p-3"
        required
      />

      <input
        name="content_url"
        placeholder="رابط المحتوى"
        className="w-full border rounded-lg p-3"
      />

      <input
        name="order_index"
        type="number"
        defaultValue={0}
        className="w-full border rounded-lg p-3"
      />

      <label className="flex gap-2 justify-end items-center">
        <span>معاينة مجانية</span>
        <input
          type="checkbox"
          name="is_free_preview"
        />
      </label>

      <button className="bg-[#087a54] text-white px-5 py-3 rounded-lg">
        إضافة درس
      </button>
    </form>
  );
}
