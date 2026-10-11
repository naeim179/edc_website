"use client";

import {
  useTransition,
} from "react";

import {
  deleteCourse,
} from "@/app/actions/admin-courses";

import {
  useLanguage,
} from "@/components/LanguageProvider";

export default function DeleteCourseButton({
  id,
}: {
  id: string;
}) {
  const {
    t,
  } = useLanguage();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  function handleDelete() {
    const confirmed =
      window.confirm(
        t.adminCourseCard.deleteConfirm
      );

    if (!confirmed) {
      return;
    }

    startTransition(
      async () => {
        await deleteCourse(
          id
        );
      }
    );
  }

  return (
    <button
      type="button"
      onClick={
        handleDelete
      }
      disabled={
        isPending
      }
      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-sm transition disabled:opacity-50"
    >
      {isPending
        ? t.adminCourseCard.deleting
        : t.adminCourseCard.delete}
    </button>
  );
}
