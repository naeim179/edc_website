"use client";

import { updateTeacherProfile } from "@/app/actions/teacher-profile";


type Props = {
  teacherId: string;

  profile?: {
    image_url: string | null;
    bio: string | null;
    specialization: string | null;
    experience_years: number | null;
  } | null;
};


export default function TeacherProfileForm({
  teacherId,
  profile,
}: Props) {


  const action =
    updateTeacherProfile.bind(
      null,
      teacherId
    );


  return (

    <form
      action={action}
      className="bg-white border rounded-2xl p-6 space-y-5"
    >

      <div>

        <label className="block font-bold mb-2">
          صورة المدرس
        </label>

        <input
          name="image_url"
          defaultValue={profile?.image_url ?? ""}
          placeholder="رابط الصورة"
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>


      <div>

        <label className="block font-bold mb-2">
          التخصص
        </label>

        <input
          name="specialization"
          defaultValue={profile?.specialization ?? ""}
          placeholder="مثال: برمجة، أمن سيبراني..."
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
          defaultValue={profile?.bio ?? ""}
          rows={5}
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>


      <button
        type="submit"
        className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
      >
        حفظ الملف الشخصي
      </button>


    </form>

  );

}
