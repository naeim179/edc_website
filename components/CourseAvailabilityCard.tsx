"use client";

import {
  useLanguage,
} from "@/components/LanguageProvider";

type Props = {
  courseType:
    | "group"
    | "private";
  registrationOpen: boolean;
  registrationState: string;
  hasOwnPrivateHold: boolean;
  groupDayOfWeek?: number | null;
  groupStartTime?: string | null;
  groupEndTime?: string | null;
};

function formatTime(
  value:
    | string
    | null
    | undefined,
  isArabic: boolean
) {
  if (!value) {
    return "—";
  }

  const [
    hourText,
    minute = "00",
  ] =
    value
      .slice(0, 5)
      .split(":");

  const hour =
    Number(hourText);

  const suffix =
    hour >= 12
      ? isArabic
        ? "م"
        : "PM"
      : isArabic
        ? "ص"
        : "AM";

  return `${
    hour % 12 || 12
  }:${minute} ${suffix}`;
}

export default function CourseAvailabilityCard({
  courseType,
  registrationOpen,
  registrationState,
  hasOwnPrivateHold,
  groupDayOfWeek,
  groupStartTime,
  groupEndTime,
}: Props) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.booking;

  const schedule =
    t.scheduling;

  const DAYS = [
    schedule.sunday,
    schedule.monday,
    schedule.tuesday,
    schedule.wednesday,
    schedule.thursday,
    schedule.friday,
    schedule.saturday,
  ];

  if (
    courseType ===
    "group"
  ) {
    const day =
      groupDayOfWeek != null
        ? DAYS[
            groupDayOfWeek
          ]
        : "—";

    return (
      <div className="mt-6 overflow-hidden rounded-[22px] border border-[#E4E9E6] bg-[#FAFCFB]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#A06A45]">
              {
                copy.groupSchedule
              }
            </p>

            <p className="mt-2 text-lg font-bold text-[#24332E]">
              {day}
            </p>

            <p className="mt-1 text-sm text-[#68756F]">
              {formatTime(
                groupStartTime,
                isArabic
              )}{" "}
              →{" "}
              {formatTime(
                groupEndTime,
                isArabic
              )}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
              registrationOpen
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                registrationOpen
                  ? "bg-emerald-500"
                  : "bg-red-400"
              }`}
            />

            {registrationOpen
              ? copy.registrationOpen
              : copy.registrationClosed}
          </span>
        </div>
      </div>
    );
  }

  let label =
    copy.privateAvailable;

  let description =
    copy.chooseTwoAppointments;

  let classes =
    "bg-emerald-50 text-emerald-700";

  if (
    registrationState ===
    "booked"
  ) {
    label =
      copy.privateBooked;

    description =
      copy.privateBookedText;

    classes =
      "bg-red-50 text-red-600";
  } else if (
    registrationState ===
    "held"
  ) {
    label =
      hasOwnPrivateHold
        ? copy.yourHold
        : copy.temporarilyHeld;

    description =
      hasOwnPrivateHold
        ? copy.completePaymentToConfirm
        : copy.anotherStudentCheckout;

    classes =
      "bg-amber-50 text-amber-700";
  } else if (
    registrationState ===
      "closed" ||
    !registrationOpen
  ) {
    label =
      copy.privateClosed;

    description =
      copy.privateClosedText;

    classes =
      "bg-slate-100 text-slate-600";
  }

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-[22px] border border-[#E4E9E6] bg-[#FAFCFB] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold tracking-wide text-[#A06A45]">
          {
            copy.privateLabel
          }
        </p>

        <h3 className="mt-2 text-lg font-bold text-[#24332E]">
          {label}
        </h3>

        <p className="mt-1 text-sm text-[#68756F]">
          {
            description
          }
        </p>
      </div>

      <span
        className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${classes}`}
      >
        {label}
      </span>
    </div>
  );
}
