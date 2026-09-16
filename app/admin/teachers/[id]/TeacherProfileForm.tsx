"use client";

import {
  updateTeacherProfile
} from "@/app/actions/teacher-profile";


export default function TeacherProfileForm({
  teacherId,
  profile,
}: {
  teacherId:string;

  profile:{
    image_url:string|null;
    bio:string|null;
    specialization:string|null;
    experience_years:number|null;
  }|null;

}) {


  const action =
    updateTeacherProfile.bind(
      null,
      teacherId
    );


  return (

    <form
      action={action}
      className="bg-white border rounded-2xl p-6 space-y-5"
      dir="rtl"
    >

      <h2 className="text-lg font-bold">
        معلومات ملف المدرس
      </h2>


      <div>

        <label className="block font-bold mb-2">
          رابط صورة المدرس
        </label>

        <input
          name="image_url"
          defaultValue={
            profile?.image_url ?? ""
          }
          placeholder="https://..."
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>



      <div>

        <label className="block font-bold mb-2">
          التخصص
        </label>


        <input
          name="specialization"
          defaultValue={
            profile?.specialization ?? ""
          }
          placeholder="مثال: Cyber Security"
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>




      <div>

        <label className="block font-bold mb-2">
          سنوات الخبرة
        </label>


        <input
          name="experience_years"
          type="number"
          min="0"
          defaultValue={
            profile?.experience_years ?? 0
          }
          className="w-full border rounded-xl px-4 py-3"
        />


      </div>




      <div>

        <label className="block font-bold mb-2">
          نبذة عن المدرس
        </label>


        <textarea
          name="bio"
          rows={5}
          defaultValue={
            profile?.bio ?? ""
          }
          placeholder="اكتب نبذة عن خبرة المدرس..."
          className="w-full border rounded-xl px-4 py-3"
        />


      </div>




      <button
        type="submit"
        className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
      >
        حفظ ملف المدرس
      </button>


    </form>

  );
}
