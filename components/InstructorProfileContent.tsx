"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

type TeacherProfile = {
  image_url: string | null;
  bio: string | null;
  specialization: string | null;
  experience_years: number | null;
};

type Instructor = {
  id: string;
  full_name: string | null;
  teacher_profiles?: TeacherProfile | TeacherProfile[] | null;
};

function formatYears(n: number, isArabic: boolean) {
  if (!isArabic) return `${n} ${n === 1 ? "year" : "years"} of experience`;
  if (n === 1) return "سنة خبرة";
  if (n === 2) return "سنتان خبرة";
  if (n >= 3 && n <= 10) return `${n} سنوات خبرة`;
  return `${n} سنة خبرة`;
}

export default function InstructorProfileContent({
  instructor,
}: {
  instructor: Instructor;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const profileData = instructor.teacher_profiles ?? null;

  const profile = Array.isArray(profileData)
    ? profileData[0] ?? null
    : profileData;

  const name =
    instructor.full_name ?? (isArabic ? "مدرب" : "Instructor");

  return (
    <div
      className="max-w-3xl mx-auto w-full space-y-5"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-bold text-[#124b8a] hover:underline"
      >
        {isArabic ? "رجوع للدورة" : "Back to course"}
      </button>

      <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 md:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-blue-50 border-4 border-white shadow-md">
            {profile?.image_url ? (
              <img
                src={profile.image_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-[#124b8a]">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="mt-5 text-2xl md:text-3xl font-bold text-slate-900">
            {name}
          </h1>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {profile?.specialization && (
              <span className="rounded-full bg-blue-50 text-[#124b8a] px-4 py-1.5 text-sm font-bold">
                {profile.specialization}
              </span>
            )}

            {profile?.experience_years != null &&
              profile.experience_years > 0 && (
                <span className="rounded-full bg-amber-50 text-amber-700 px-4 py-1.5 text-sm font-bold">
                  {formatYears(profile.experience_years, isArabic)}
                </span>
              )}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isArabic ? "نبذة عن المدرب" : "About the instructor"}
          </h2>

          {profile?.bio ? (
            <p className="text-slate-600 leading-8 whitespace-pre-line break-words">
              {profile.bio}
            </p>
          ) : (
            <p className="text-slate-400">
              {isArabic
                ? "ما أضاف المدرب نبذة بعد."
                : "This instructor hasn't added a bio yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
