"use client";

import { createTeacher } from "@/app/actions/teachers";
import { useTransition } from "react";

export default function TeacherCreateForm() {

  const [pending, startTransition] = useTransition();


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
        إضافة معلم جديد
      </h2>


      <input
        name="fullName"
        placeholder="اسم المعلم"
        required
        className="w-full border rounded-lg p-3"
      />


      <input
        name="email"
        type="email"
        placeholder="البريد الإلكتروني"
        required
        className="w-full border rounded-lg p-3"
      />


      <input
        name="password"
        type="password"
        placeholder="كلمة المرور"
        required
        className="w-full border rounded-lg p-3"
      />


      <button
        disabled={pending}
        className="bg-[#087a54] text-white px-6 py-3 rounded-lg font-bold"
      >
        {pending ? "جاري الإنشاء..." : "إنشاء المعلم"}
      </button>

    </form>
  );
}
