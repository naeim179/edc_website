"use client";

import { createTeacherLesson } from "@/app/actions/teacher-content";


export default function CreateLessonForm({
  courseId,
  sectionId,
}:{
  courseId:string;
  sectionId:string;
}){


  const action =
    createTeacherLesson.bind(
      null,
      sectionId,
      courseId
    );


  return (

    <form
      action={action}
      className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl"
    >

      <input
        name="title"
        placeholder="اسم الدرس"
        required
        className="w-full border rounded-xl px-4 py-2"
      />


      <input
        name="content_url"
        placeholder="رابط الفيديو أو المحتوى"
        className="w-full border rounded-xl px-4 py-2"
      />


      <button
        className="bg-[#087a54] text-white px-4 py-2 rounded-xl font-bold"
      >
        إضافة الدرس
      </button>


    </form>

  );

}
