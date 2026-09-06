import { createSection } from "@/app/actions/admin-sections";

export default function SectionForm({
  courseId,
}: {
  courseId: string;
}) {
  const action = createSection.bind(null, courseId);

  return (
    <form
      action={action}
      className="bg-white rounded-xl border p-5 space-y-4 text-right"
    >
      <input
        name="title"
        placeholder="اسم القسم"
        className="w-full border rounded-lg p-3"
        required
      />

      <input
        name="order_index"
        type="number"
        defaultValue={0}
        placeholder="الترتيب"
        className="w-full border rounded-lg p-3"
      />

      <button className="bg-[#087a54] text-white px-5 py-3 rounded-lg">
        إضافة قسم
      </button>
    </form>
  );
}
