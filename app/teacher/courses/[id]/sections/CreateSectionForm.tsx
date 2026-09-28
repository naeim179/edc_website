"use client";

import { useLanguage } from "@/components/LanguageProvider";

import { createTeacherSection } from "@/app/actions/teacher-content";


export default function CreateSectionForm({
  courseId,
}:{
  courseId:string;
}){

  const { t } = useLanguage();

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
        {t.teacher.addSection}
      </h2>


      <input
        name="title"
        placeholder={t.teacher.sectionName}
        required
        className="w-full border rounded-xl px-4 py-3"
      />


      <button
        className="bg-[#087a54] text-white px-5 py-3 rounded-xl font-bold"
      >
        {t.teacher.addSection}
      </button>


    </form>

  );

}
