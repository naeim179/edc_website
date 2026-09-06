import { createCourse, updateCourse } from "@/app/actions/admin-courses";

type Props = {
  course?: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    is_published: boolean;
  };
};

export default function CourseForm({ course }: Props) {
  const action = course
    ? updateCourse.bind(null, course.id)
    : createCourse;

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border p-6 space-y-4 text-right"
    >
      <div>
        <label className="block mb-2 font-bold">
          عنوان الدورة
        </label>
        <input
          name="title"
          defaultValue={course?.title}
          className="w-full border rounded-lg p-3"
          required
        />
      </div>

      <div>
        <label className="block mb-2 font-bold">
          الوصف
        </label>
        <textarea
          name="description"
          defaultValue={course?.description ?? ""}
          className="w-full border rounded-lg p-3"
          rows={5}
        />
      </div>

      <div>
        <label className="block mb-2 font-bold">
          التصنيف
        </label>
        <input
          name="category"
          defaultValue={course?.category ?? ""}
          className="w-full border rounded-lg p-3"
        />
      </div>

      <label className="flex gap-2 items-center justify-end">
        <span>منشورة</span>
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={course?.is_published}
        />
      </label>

      <button
        className="bg-[#087a54] text-white px-5 py-3 rounded-lg font-bold"
      >
        حفظ
      </button>
    </form>
  );
}
