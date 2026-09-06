"use client";

import { deleteLesson } from "@/app/actions/admin-lessons";

export default function DeleteLessonButton({
  id,
  courseId,
  sectionId,
}: {
  id: string;
  courseId: string;
  sectionId: string;
}) {
  async function handleDelete() {
    if (!confirm("حذف الدرس؟")) return;

    await deleteLesson(
      id,
      courseId,
      sectionId
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-2 bg-red-500 text-white rounded-lg"
    >
      حذف
    </button>
  );
}
