"use client";

import { assignTeacherToCourse } from "@/app/actions/course-instructors";
import { useTransition } from "react";

type Teacher = {
  id: string;
  full_name: string | null;
};


export default function AssignTeacherForm({
  courseId,
  teachers,
}: {
  courseId: string;
  teachers: Teacher[];
}) {

  const [pending, startTransition] = useTransition();


  function submit(formData: FormData) {

    const teacherId =
      String(formData.get("teacherId"));


    startTransition(async () => {
      await assignTeacherToCourse(
        courseId,
        teacherId
      );
    });
  }


  return (
    <form
      action={submit}
      className="bg-white border rounded-xl p-6"
      dir="rtl"
    >

      <h2 className="font-bold mb-4">
        تعيين معلم
      </h2>


      <select
        name="teacherId"
        required
        className="w-full border rounded-lg p-3 mb-4"
      >

        <option value="">
          اختر المعلم
        </option>

        {teachers.map((teacher) => (
          <option
            key={teacher.id}
            value={teacher.id}
          >
            {teacher.full_name ?? "بدون اسم"}
          </option>
        ))}

      </select>


      <button
        disabled={pending}
        className="bg-[#087a54] text-white px-6 py-3 rounded-lg font-bold"
      >
        {pending ? "جاري الحفظ..." : "تعيين"}
      </button>

    </form>
  );
}
