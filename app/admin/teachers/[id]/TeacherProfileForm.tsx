"use client";

import ImageUploader from "@/components/ui/ImageUploader";
import { useLanguage } from "@/components/LanguageProvider";

import {
  updateTeacherProfile,
  deleteTeacherAvatar
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

  const { t } = useLanguage();

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
        {t.admin.teacherProfile}
      </h2>


      <div>

        <label className="block font-bold mb-2">
          {t.admin.teacherImage}
        </label>

        <ImageUploader
          value={profile?.image_url ?? null}
          onChange={(url) => {
            const input = document.querySelector(
              'input[name="image_url"]'
            ) as HTMLInputElement;

            if (input) {
              input.value = url;
            }
          }}
          folder="teachers"
          deleteOldImage
        />

        {profile?.image_url && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("هل تريد حذف الصورة؟")) {
                return;
              }

              await deleteTeacherAvatar(teacherId);
              window.location.reload();
            }}
            className="mt-3 text-sm font-bold text-red-600 hover:underline"
          >
            حذف الصورة
          </button>
        )}

        <input
          type="hidden"
          name="image_url"
          defaultValue={profile?.image_url ?? ""}
        />

      </div>



      <div>

        <label className="block font-bold mb-2">
          {t.admin.specialization}
        </label>


        <input
          name="specialization"
          defaultValue={
            profile?.specialization ?? ""
          }
          placeholder={t.admin.specializationExample}
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>




      <div>

        <label className="block font-bold mb-2">
          {t.admin.experienceYears}
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
          {t.admin.teacherBio}
        </label>


        <textarea
          name="bio"
          rows={5}
          defaultValue={
            profile?.bio ?? ""
          }
          placeholder={t.admin.bioPlaceholder}
          className="w-full border rounded-xl px-4 py-3"
        />


      </div>




      <button
        type="submit"
        className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
      >
        {t.admin.saveTeacherProfile}
      </button>


    </form>

  );
}
