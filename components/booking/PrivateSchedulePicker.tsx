"use client";

import Link from "next/link";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  reservePrivateSchedule,
} from "@/app/actions/private-booking";

import {
  useLanguage,
} from "@/components/LanguageProvider";

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  courseId: string;
  courseTitle: string;
  slots: Slot[];
  initialSelectedIds?: string[];
  existingBookingId?: string | null;
  existingHoldExpiresAt?: string | null;
};

function normalizeTime(
  value: string
) {
  return value.slice(0, 5);
}

function formatTime(
  value: string,
  isArabic: boolean
) {
  const clean =
    normalizeTime(value);

  const [
    hourText,
    minute = "00",
  ] =
    clean.split(":");

  const hour =
    Number(hourText);

  if (
    !Number.isFinite(hour)
  ) {
    return clean;
  }

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

export default function PrivateSchedulePicker({
  courseId,
  courseTitle,
  slots,
  initialSelectedIds = [],
  existingBookingId = null,
  existingHoldExpiresAt = null,
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

  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const [
    selected,
    setSelected,
  ] =
    useState<string[]>(
      initialSelectedIds.slice(
        0,
        2
      )
    );

  const [
    error,
    setError,
  ] =
    useState("");

  function toggleSlot(
    slotId: string
  ) {
    setError("");

    setSelected(
      (current) => {
        if (
          current.includes(
            slotId
          )
        ) {
          return current.filter(
            (id) =>
              id !== slotId
          );
        }

        if (
          current.length >= 2
        ) {
          setError(
            copy.maxTwo
          );

          return current;
        }

        return [
          ...current,
          slotId,
        ];
      }
    );
  }

  function continueCheckout() {
    if (
      selected.length !== 2
    ) {
      setError(
        copy.exactlyTwo
      );

      return;
    }

    setError("");

    startTransition(
      async () => {
        try {
          const result =
            await reservePrivateSchedule(
              courseId,
              selected
            );

          router.push(
            `/checkout/${courseId}?booking=${encodeURIComponent(
              result.bookingId
            )}`
          );
        } catch (
          actionError
        ) {
          if (
            !isArabic
          ) {
            setError(
              "Unable to reserve the selected appointments. Please try again."
            );

            return;
          }

          setError(
            actionError instanceof
              Error
              ? actionError.message
              : "تعذر حجز المواعيد"
          );
        }
      }
    );
  }

  const grouped =
    DAYS.map(
      (
        day,
        dayIndex
      ) => ({
        day,
        dayIndex,
        slots:
          slots.filter(
            (slot) =>
              slot.day_of_week ===
              dayIndex
          ),
      })
    );

  const selectedSlots =
    slots.filter(
      (slot) =>
        selected.includes(
          slot.id
        )
    );

  return (
    <div
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="mx-auto w-full max-w-6xl"
    >
      <Link
        href={`/courses/${courseId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#66736E] transition hover:text-[#1B4B43]"
      >
        ←{" "}
        {
          copy.backToCourse
        }
      </Link>

      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] px-5 py-8 text-white shadow-[0_24px_60px_rgba(27,75,67,0.16)] sm:px-8 md:px-10">
        <div className="absolute -start-20 -top-20 h-64 w-64 rounded-full bg-white/[0.05]" />
        <div className="absolute -bottom-28 end-10 h-72 w-72 rounded-full bg-[#D8B98A]/10" />

        <div className="relative max-w-3xl">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
            {
              copy.privateLabel
            }
          </span>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            {
              copy.chooseScheduleTitle
            }
          </h1>

          <p className="mt-3 text-white/70">
            {
              courseTitle
            }
          </p>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            {
              copy.chooseScheduleDescription
            }
          </p>
        </div>
      </section>

      {existingBookingId &&
        existingHoldExpiresAt && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {
              copy.activeHold
            }
          </div>
        )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_330px] lg:items-start">
        <section className="space-y-4">
          {grouped.map(
            ({
              day,
              dayIndex,
              slots:
                daySlots,
            }) => (
              <div
                key={
                  dayIndex
                }
                className="rounded-[26px] border border-[#E1E9E5] bg-white p-5 shadow-[0_12px_35px_rgba(27,75,67,0.04)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#24332E]">
                      {day}
                    </h2>

                    <p className="mt-1 text-sm text-[#89958F]">
                      {daySlots.length
                        ? `${daySlots.length} ${
                            daySlots.length ===
                            1
                              ? copy.availablePeriod
                              : copy.availablePeriods
                          }`
                        : copy.unavailable}
                    </p>
                  </div>

                  <span
                    className={`h-3 w-3 rounded-full ${
                      daySlots.length
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  />
                </div>

                {daySlots.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {daySlots.map(
                      (
                        slot
                      ) => {
                        const active =
                          selected.includes(
                            slot.id
                          );

                        return (
                          <button
                            key={
                              slot.id
                            }
                            type="button"
                            onClick={() =>
                              toggleSlot(
                                slot.id
                              )
                            }
                            className={`group relative rounded-2xl border px-5 py-4 text-start transition ${
                              active
                                ? "border-[#1B4B43] bg-[#EEF5F2] shadow-[0_12px_28px_rgba(27,75,67,0.10)] ring-2 ring-[#1B4B43]/10"
                                : "border-[#E1E9E5] bg-[#FCFDFC] hover:border-[#ABC8BD] hover:bg-[#F7FAF8]"
                            }`}
                          >
                            <span className="block text-xs font-bold text-[#89958F]">
                              {
                                copy.period
                              }
                            </span>

                            <span className="mt-2 block text-lg font-bold text-[#1B4B43]">
                              {formatTime(
                                slot.start_time,
                                isArabic
                              )}
                              {"  →  "}
                              {formatTime(
                                slot.end_time,
                                isArabic
                              )}
                            </span>

                            <span
                              className={`absolute end-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                                active
                                  ? "border-[#1B4B43] bg-[#1B4B43] text-white"
                                  : "border-[#CEDBD5] bg-white"
                              }`}
                            >
                              {active
                                ? "✓"
                                : ""}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-[#F7F9F8] px-4 py-5 text-sm text-[#9AA59F]">
                    {
                      copy.unavailable
                    }
                  </div>
                )}
              </div>
            )
          )}
        </section>

        <aside className="rounded-[26px] border border-[#E1E9E5] bg-white p-5 shadow-[0_18px_45px_rgba(27,75,67,0.07)] lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#24332E]">
              {
                copy.selectedSchedule
              }
            </h2>

            <span className="rounded-full bg-[#F3F6F4] px-3 py-1 text-xs font-bold text-[#1B4B43]">
              {
                selected.length
              }{" "}
              / 2
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {selectedSlots.length ? (
              selectedSlots.map(
                (
                  slot,
                  index
                ) => (
                  <div
                    key={
                      slot.id
                    }
                    className="rounded-2xl border border-[#E8ECEA] bg-[#FAFCFB] p-4"
                  >
                    <p className="text-xs font-bold text-[#A06A45]">
                      {
                        copy.appointment
                      }{" "}
                      {index +
                        1}
                    </p>

                    <p className="mt-1 font-bold text-[#24332E]">
                      {
                        DAYS[
                          slot
                            .day_of_week
                        ]
                      }
                    </p>

                    <p className="mt-1 text-sm text-[#65716C]">
                      {formatTime(
                        slot.start_time,
                        isArabic
                      )}{" "}
                      →{" "}
                      {formatTime(
                        slot.end_time,
                        isArabic
                      )}
                    </p>
                  </div>
                )
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D7E1DC] p-5 text-center text-sm text-[#929D98]">
                {
                  copy.noSelection
                }
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={
              continueCheckout
            }
            disabled={
              pending ||
              selected.length !==
                2
            }
            className="mt-5 w-full rounded-2xl bg-[#C9704A] px-5 py-4 font-bold text-white shadow-[0_12px_28px_rgba(201,112,74,0.20)] transition hover:bg-[#B96240] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending
              ? copy.reserving
              : copy.continueToPayment}
          </button>

          <p className="mt-3 text-center text-xs leading-5 text-[#929D98]">
            {
              copy.temporaryHoldHint
            }
          </p>
        </aside>
      </div>
    </div>
  );
}
