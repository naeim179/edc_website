"use client";

import { assignTeacherToOffer } from "@/app/actions/course-offers";


export default function AssignOfferTeacher({
  courseId,
  offerId,
  teachers,
  currentTeacher,
}: {
  courseId:string;
  offerId:string;
  teachers:{
    id:string;
    full_name:string|null;
  }[];
  currentTeacher:string;
}) {


  return (

    <form
      action={async(formData)=>{

        const teacherId =
          String(
            formData.get("teacherId")
          );

        await assignTeacherToOffer(
          offerId,
          teacherId,
          courseId
        );

      }}
      className="space-y-3"
    >


      <p className="font-bold">
        المعلم الحالي:
        {" "}
        {currentTeacher || "لا يوجد"}
      </p>


      <select
        name="teacherId"
        required
        className="w-full border rounded-xl px-4 py-3"
      >

        <option value="">
          اختر المعلم
        </option>


        {teachers.map((teacher)=>(

          <option
            key={teacher.id}
            value={teacher.id}
          >
            {teacher.full_name}
          </option>

        ))}


      </select>


      <button
        type="submit"
        className="bg-[#124b8a] text-white px-5 py-2 rounded-xl font-bold"
      >
        تعيين المعلم
      </button>


    </form>

  );
}
