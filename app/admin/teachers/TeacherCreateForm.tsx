"use client";

import { createTeacher } from "@/app/actions/teachers";
import { useTransition } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function TeacherCreateForm() {

  const [pending, startTransition] = useTransition();
  const { t } = useLanguage();


  function submit(formData: FormData) {
    startTransition(async () => {
      await createTeacher(formData);
    });
  }


  return (
    <form
      action={submit}
      className="bg-white border rounded-xl p-6 space-y-4"
      dir="rtl"
    >

      <h2 className="font-bold">
        {t.admin.addTeacher}
      </h2>


      <input
        name="fullName"
        placeholder={t.admin.teacherName}
        required
        className="w-full border rounded-lg p-3"
      />


      <input
        name="email"
        type="email"
        placeholder={t.admin.email}
        required
        className="w-full border rounded-lg p-3"
      />


      <input
        name="password"
        type="password"
        placeholder={t.admin.password}
        required
        className="w-full border rounded-lg p-3"
      />


      <button
        disabled={pending}
        className="bg-[#087a54] text-white px-6 py-3 rounded-lg font-bold"
      >
        {pending ? t.admin.creatingTeacher : t.admin.createTeacher}
      </button>

    </form>
  );
}
