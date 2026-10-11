"use client";

import {
  useLanguage,
} from "@/components/LanguageProvider";

export type AnnouncementBannerItem = {
  id: string;
  title: string;
  message: string;
  audience:
    | "student"
    | "teacher";
  created_at: string;
};

export default function AnnouncementBanner({
  announcements,
}: {
  announcements:
    AnnouncementBannerItem[];
}) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.announcements;

  if (
    announcements.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      className="space-y-3 px-3 pt-3 sm:px-5 lg:px-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      {announcements.map(
        (announcement) => (
          <div
            key={
              announcement.id
            }
            className="relative overflow-hidden rounded-[22px] border border-[#E4D7BC] bg-gradient-to-l from-[#FFF8E9] via-[#FFFDF8] to-[#F2F8F5] shadow-[0_10px_30px_rgba(33,68,58,0.06)]"
          >
            <div className="absolute inset-y-0 start-0 w-1.5 bg-[#C9704A]" />

            <div className="flex items-start gap-4 px-5 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1B4B43] text-xl text-white shadow-sm">
                📢
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F5E8CF] px-2.5 py-1 text-[11px] font-bold text-[#8A633D]">
                    {announcement.audience ===
                    "teacher"
                      ? copy.bannerTeacher
                      : copy.bannerStudent}
                  </span>

                  <span className="text-xs text-[#9A8F80]">
                    {
                      copy.fromAdmin
                    }
                  </span>
                </div>

                <h2 className="mt-2 text-base font-bold text-[#24332E] sm:text-lg">
                  {
                    announcement.title
                  }
                </h2>

                <p className="mt-1 whitespace-pre-line text-sm leading-7 text-[#65716C]">
                  {
                    announcement.message
                  }
                </p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
