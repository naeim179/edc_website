"use client";

import { updateTeacherProfile } from "@/app/actions/teacher-profile";
import ImageUploader from "@/components/ui/ImageUploader";
import { useLanguage } from "@/components/LanguageProvider";


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
    >

      <div>

        <label className="block font-bold mb-2">
          {t.teacherProfile.image}
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
          label={t.teacherProfile.image}
        />

        <input
          type="hidden"
          name="image_url"
          defaultValue={profile?.image_url ?? ""}
        />

      </div>


      <div>

        <label htmlFor="teacher-specialization" className="block font-bold mb-2">
          {t.teacherProfile.specialization}
        </label>

        <input
          id="teacher-specialization"
          name="specialization"
          defaultValue={profile?.specialization ?? ""}
          placeholder={t.teacherProfile.specializationPlaceholder}
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>


      <div>

        <label htmlFor="teacher-experience" className="block font-bold mb-2">
          {t.teacherProfile.experience}
        </label>

        <input
          id="teacher-experience"
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

        <label htmlFor="teacher-bio" className="block font-bold mb-2">
          {t.teacherProfile.bio}
        </label>

        <textarea
          id="teacher-bio"
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
        {t.teacherProfile.save}
      </button>


    </form>

  );

}
