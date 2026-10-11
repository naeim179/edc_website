"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/LanguageProvider";

export default function PrivateScheduleBlocked({
  courseId,
  reason,
}: {
  courseId: string;
  reason:
    | "booked"
    | "held"
    | "closed"
    | "unavailable";
}) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.booking;

  let title =
    copy.courseUnavailable;

  let text =
    copy.unavailableText;

  if (
    reason === "booked"
  ) {
    title =
      copy.bookedTitle;

    text =
      copy.bookedText;
  } else if (
    reason === "held"
  ) {
    title =
      copy.heldTitle;

    text =
      copy.heldText;
  } else if (
    reason === "closed"
  ) {
    title =
      copy.registrationPausedTitle;

    text =
      copy.registrationPausedText;
  }

  return (
    <div
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="mx-auto max-w-xl rounded-[30px] border border-[#E6DED0] bg-white p-8 text-center shadow-sm"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F3EC] text-2xl">
        🔒
      </div>

      <h1 className="mt-5 text-2xl font-bold text-[#2A2420]">
        {title}
      </h1>

      <p className="mt-3 leading-7 text-[#746A5F]">
        {text}
      </p>

      <Link
        href={`/courses/${courseId}`}
        className="mt-6 inline-flex rounded-xl bg-[#1B4B43] px-6 py-3 font-bold text-white"
      >
        {
          copy.backToCourse
        }
      </Link>
    </div>
  );
}
