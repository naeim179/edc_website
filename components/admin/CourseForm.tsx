import { createCourse, updateCourse } from "@/app/actions/admin-courses";

type Props = {
  course?: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    price: number | null;
    currency: string | null;
    is_free: boolean;
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

      <input
        name="title"
        defaultValue={course?.title}
        placeholder="عنوان الدورة"
        className="w-full border rounded-lg p-3"
        required
      />


      <textarea
        name="description"
        defaultValue={course?.description ?? ""}
        placeholder="الوصف"
        className="w-full border rounded-lg p-3"
      />


      <input
        name="category"
        defaultValue={course?.category ?? ""}
        placeholder="التصنيف"
        className="w-full border rounded-lg p-3"
      />


      <label className="flex gap-2 justify-end items-center">
        <span>
          دورة مجانية
        </span>

        <input
          type="checkbox"
          name="is_free"
          defaultChecked={course?.is_free}
        />
      </label>


      <input
        name="price"
        type="number"
        step="0.01"
        defaultValue={course?.price ?? 0}
        placeholder="السعر"
        className="w-full border rounded-lg p-3"
      />


      <select
        name="currency"
        defaultValue={course?.currency ?? "JOD"}
        className="w-full border rounded-lg p-3"
      >
        <option value="JOD">
          JOD
        </option>

        <option value="USD">
          USD
        </option>
      </select>


      <label className="flex gap-2 justify-end items-center">
        <span>
          منشورة
        </span>

        <input
          type="checkbox"
          name="is_published"
          defaultChecked={course?.is_published}
        />
      </label>


      <button className="bg-[#087a54] text-white px-5 py-3 rounded-lg">
        حفظ
      </button>

    </form>
  );
}
