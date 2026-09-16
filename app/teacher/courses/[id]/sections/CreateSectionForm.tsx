"use client";

import { createTeacherSection } from "@/app/actions/teacher-content";


export default function CreateSectionForm({
  courseId,
}:{
  courseId:string;
}){


  const action =
    createTeacherSection.bind(
      null,
      courseId
    );


  return (

    <form
      action={action}
      className="bg-white border rounded-xl p-5 space-y-4"
    >

      <h2 className="font-bold">
        إضافة قسم جديد
      </h2>


      <input
        name="title"
        placeholder="اسم القسم"
        required
        className="w-full border rounded-xl px-4 py-3"
      />


      <button
        className="bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold"
      >
        إضافة القسم
      </button>


    </form>

  );

}
